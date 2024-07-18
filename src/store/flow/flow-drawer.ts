import { Effect } from 'effect'
import { action, makeObservable, observable, runInAction } from 'mobx'
import { nanoid } from 'nanoid'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  XYPosition,
} from 'reactflow'

import { DoFlow } from '@/store/flow/do-flow.ts'
import {
  Flow,
  FlowNodeData,
  NodeDataTypes,
  NodeType,
  NodeTypes,
  ReactFlowNodeTarget,
} from '@/store/types.ts'

export class FlowDrawer {
  flow: DoFlow

  nodes: Node[] = []
  edges: Edge[] = []

  loaded: boolean = false
  constructor(flow: DoFlow) {
    this.flow = flow

    makeObservable(this, {
      loaded: observable,
      nodes: observable,
      edges: observable,

      onNodesChange: action,
      onEdgesChange: action,
    })
  }

  get rootStore() {
    return this.flow.store.rootStore
  }

  initialize() {
    runInAction(() => {
      this.loaded = false
    })

    const creatingNodes: Node[] = []
    const creatingEdges: Edge[] = []

    FlowDrawer.initializeChildNodes(
      this.flow.snapshot.childFlowIds ?? [],
      (id) => this.flow.store.getFlowById(id)?.snapshot,
      creatingNodes,
      creatingEdges,
    )
    FlowDrawer.initializeChildNodes(
      this.flow.snapshot.childNodeIds ?? [],
      (id) => this.flow.store.rootStore.nodeStore.getNodeById(id)?.snapshot,
      creatingNodes,
      creatingEdges,
    )

    runInAction(() => {
      this.nodes = creatingNodes
      this.edges = creatingEdges
      this.loaded = true
    })
  }
  //
  // action
  //
  onNodesChange(changes: NodeChange[]) {
    this.nodes = applyNodeChanges(changes, this.nodes)
  }
  onEdgesChange(changes: EdgeChange[]) {
    this.edges = applyEdgeChanges(changes, this.edges)
  }
  /**
   * Todo:
   * 지정된 부모 노드에 새로운 자식 노드를 추가하고, 그들 사이에 엣지를 생성합니다.
   *
   * 주어진 위치에 'mindMap' 타입의 새로운 노드를 생성하고, 기본 레이블 'New Node' 를 사용합니다.
   * 그리고 부모 노드와 새로운 노드를 연결하는 엣지를 생성합니다.
   *
   * @param {Node} parentNode - 새로운 노드가 추가될 부모 노드.
   * @param {XYPosition} position - 새로운 노드가 배치될 위치.
   **/
  addChildNode(parentNode: Node, position: XYPosition) {
    const creatingNode = {
      id: nanoid(),
      type: 'text',
      data: { title: 'new Node' },
      position,
    }

    const creatingEdge = FlowDrawer.createEdge({
      sourceId: parentNode.id,
      targetId: creatingNode.id,
    })

    runInAction(() => {
      this.nodes.push(creatingNode)
      this.edges.push(creatingEdge)
    })
  }
  /**
   * 노드를 엣지로 연결합니다.
   */
  connectNodes(sourceNode: Node, targetNode: Node) {
    const isSourceNodeFlow = sourceNode.type === 'flow'

    // 자기 자신으로 연결시, 중복 연결시 데이터가 계속 추가되는 이슈 수정
    const isSelf = sourceNode.id === targetNode.id
    const isDuplicated =
      this.edges.findIndex((edge) => {
        return edge.source === sourceNode.id && edge.target === targetNode.id
      }) > -1

    if (isSelf || isDuplicated) {
      return
    }

    const edgeToCreate = FlowDrawer.createEdge({
      sourceId: sourceNode.id,
      targetId: targetNode.id,
    })

    runInAction(() => {
      this.edges = [...this.edges, edgeToCreate]
    })

    const flowOrNode = isSourceNodeFlow
      ? this.rootStore.flowStore.getFlowById(sourceNode.id)
      : this.rootStore.nodeStore.getNodeById(sourceNode.id)

    const targets = [
      ...(flowOrNode.snapshot.targets ?? []),
      { id: targetNode.id },
    ]

    const restoreOnError = () => {
      runInAction(() => {
        this.edges = this.edges.filter((edge) => edge.id !== edgeToCreate.id)
      })
    }

    if (isSourceNodeFlow) {
      Effect.runPromise(
        this.rootStore.flowStore.updateFlow({
          flowId: sourceNode.id,
          changedFlow: {
            targets,
          },
        }),
      ).catch((err) => {
        this.rootStore.showError(err)
        restoreOnError()
      })
    } else {
      Effect.runPromise(
        this.rootStore.nodeStore.updateNode({
          nodeId: sourceNode.id,
          changedNode: {
            targets,
          },
        }),
      ).catch((err) => {
        this.rootStore.showError(err)
        restoreOnError()
      })
    }
  }
  updateEdge(
    edgeId: string,
    updatingEdgeData: Partial<Omit<ReactFlowNodeTarget, 'id'>>,
  ) {
    const updatingEdge = this.edges.find((edge) => edge.id === edgeId)

    if (!updatingEdge) {
      return
    }

    const restoreOnError = () => {
      this.edges.map((edge) =>
        edge.id === edgeId ? { ...updatingEdge } : edge,
      )
    }

    runInAction(() => {
      this.edges = this.edges.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              data: {
                ...edge.data,
                ...updatingEdgeData,
              },
            }
          : edge,
      )
    })

    const sourceNode = this.nodes.find(
      (node) => node.id === updatingEdge.source,
    )

    if (!sourceNode) {
      restoreOnError()
      return
    }

    if (sourceNode.type === 'flow') {
      Effect.runPromise(
        this.flow.store.updateFlow({
          flowId: updatingEdge.source,
          changedFlow: {
            targets: (
              this.flow.store.getFlowById(updatingEdge.source)?.snapshot
                .targets ?? []
            ).map((target) =>
              target.id === updatingEdge.target
                ? { ...target, ...updatingEdgeData }
                : target,
            ),
          },
        }),
      ).catch((ex) => {
        restoreOnError()
        this.rootStore.showError(ex)
      })
    } else {
      Effect.runPromise(
        this.rootStore.nodeStore.updateNode({
          nodeId: updatingEdge.source,
          changedNode: {
            targets: (
              this.rootStore.nodeStore.getNodeById(updatingEdge.source)
                ?.snapshot.targets ?? []
            ).map((target) =>
              target.id === updatingEdge.target
                ? { ...target, ...updatingEdgeData }
                : target,
            ),
          },
        }),
      ).catch((ex) => {
        restoreOnError()
        this.rootStore.showError(ex)
      })
    }
  }
  deleteEdge(edgeId: string) {
    runInAction(() => {
      this.edges = this.edges.filter((edge) => edge.id !== edgeId)
    })
  }
  /**
   * FlowNode 를 추가하고, Flow 를 저장한다.
   */
  addFlowNode(position: XYPosition) {
    const reactFlowNode = FlowDrawer.createReactFlowNodeByNodeType({
      nodeType: 'flow',
      position,
    })
    const flow = FlowDrawer.createFlowNodeByReactFlowNode({
      flowId: reactFlowNode.id,
      parentFlowId: this.flow.id,
      data: reactFlowNode.data as FlowNodeData,
      position,
    })

    runInAction(() => {
      this.nodes = [...this.nodes, reactFlowNode]
    })

    Effect.runPromise(this.flow.createChildFlow(flow)).catch((err) => {
      this.rootStore.showError(err)
      runInAction(() => {
        this.nodes = this.nodes.filter((node) => node.id !== reactFlowNode.id)
      })
    })
  }
  /**
   * Node 를 추가하고, 저장한다.
   */
  addNode({
    nodeType,
    position,
  }: {
    nodeType: NodeType
    position: XYPosition
  }) {
    const reactFlowNode = FlowDrawer.createReactFlowNodeByNodeType({
      nodeType,
      position,
    })
    const node = FlowDrawer.createNodeByReactFlowNode({
      nodeId: reactFlowNode.id,
      type: nodeType,
      parentFlowId: this.flow.id,
      data: reactFlowNode.data,
      position,
    })

    runInAction(() => {
      this.nodes = [...this.nodes, reactFlowNode]
    })

    Effect.runPromise(this.flow.createChildNode(node)).catch((err) => {
      this.rootStore.showError(err)

      runInAction(() => {
        this.nodes = this.nodes.filter((node) => node.id !== reactFlowNode.id)
      })
    })
  }
  /**
   * 지정된 노드의 레이블을 업데이트합니다.
   *
   * 현재 상태에서 주어진 nodeId를 가진 노드를 찾아 해당 노드의 레이블을 제공된 값으로 업데이트합니다.
   */
  updateNodeTitle({
    id,
    type,
    title,
  }: {
    id: string
    type: NodeType | 'flow'
    title: string
  }) {
    if (type === 'flow') {
      Effect.runPromise(
        this.flow.store.updateFlow({
          flowId: id,
          changedFlow: {
            data: { title },
          },
        }),
      ).catch(this.rootStore.showError)
    } else {
      Effect.runPromise(
        this.rootStore.nodeStore.updateNode({
          nodeId: id,
          changedNode: {
            data: { title },
          },
        }),
      ).catch(this.rootStore.showError)
    }
  }
  /**
   * Node 의 포지션을 변경한다.
   */
  updateNodePosition({
    id,
    type,
    position,
  }: {
    id: string
    type: string
    position: XYPosition
  }) {
    if (type === 'flow') {
      Effect.runPromise(
        this.flow.store.updateFlow({
          flowId: id,
          changedFlow: {
            position,
          },
        }),
      ).catch(this.rootStore.showError)
    } else {
      Effect.runPromise(
        this.rootStore.nodeStore.updateNode({
          nodeId: id,
          changedNode: {
            position,
          },
        }),
      ).catch(this.rootStore.showError)
    }
  }
  /**
   * Node 를 제거한다.
   * Todo, isTrashed : true 로 변경하고, store 의 map 에서 없애고 app 초기화시에 불러오지 말자.
   * 1. this.nodes 제거
   * 2. 실제 저장된 node의 isTrashed : true 로 변경
   */
  removeNode(id: string, type: NodeType | 'flow') {
    const removedNode = this.nodes.find((node) => node.id === id)

    if (!removedNode) {
      return
    }

    runInAction(() => {
      this.nodes = this.nodes.filter((node) => node.id !== id)
    })

    const restoreOnError = () => {
      runInAction(() => {
        this.nodes = [...this.nodes, removedNode]
      })
    }

    if (type === 'flow') {
      Effect.runPromise(this.flow.store.removeFlow(id)).catch((err) => {
        this.rootStore.showError(err)
        restoreOnError()
      })
    } else {
      Effect.runPromise(this.rootStore.nodeStore.removeNode(id)).catch(
        (err) => {
          this.rootStore.showError(err)
          restoreOnError()
        },
      )
    }
  }

  //
  // Utils
  //

  /**
   * 자식 노드의 위치를 계산하는 함수
   *
   * 부모 노드의 위치와 이벤트를 기반으로 자식 노드의 위치를 계산합니다.
   *
   * @param {Object} params - 입력 매개변수를 포함하는 객체
   * @param {MouseEvent | TouchEvent} params.event - 마우스 또는 터치 이벤트
   * @param {Node} [params.parentNode] - 부모 노드 객체
   * @param {HTMLDivElement | null} [params.domNode] - 현재 다이어그램의 DOM 노드
   * @param {Function} params.screenToFlowPosition - 화면 좌표 (예: 마우스 클릭 위치)를 플로우 좌표로 변환하는 함수
   * @returns {XYPosition | undefined} - 자식 노드의 위치 또는 undefined
   */
  static getChildNodePosition({
    event,
    parentNode,
    domNode,
    screenToFlowPosition,
  }: {
    event: MouseEvent | TouchEvent
    parentNode?: Node
    domNode?: HTMLDivElement | null
    screenToFlowPosition: (position: XYPosition) => XYPosition
  }): XYPosition | undefined {
    if (
      !domNode ||
      // 노드가 아직 초기화되지 않은 경우, 위치나 크기가 없을 수 있습니다.
      !parentNode?.positionAbsolute ||
      !parentNode?.width ||
      !parentNode?.height
    ) {
      return
    }

    const isTouchEvent = 'touches' in event
    const x = isTouchEvent ? event.touches[0].clientX : event.clientX
    const y = isTouchEvent ? event.touches[0].clientY : event.clientY
    const panePosition = screenToFlowPosition({
      x,
      y,
    })

    // 자식 노드는 부모 노드에 상대적으로 위치하기 때문에 positionAbsolute 를 사용하여 계산합니다.
    return {
      x: panePosition.x - parentNode.positionAbsolute.x + parentNode.width / 2,
      y: panePosition.y - parentNode.positionAbsolute.y + parentNode.height / 2,
    }
  }

  /**
   * 저장되어 있는 Flow, Node Data 를 React Flow 의 Node Data 로 변환한다.
   *
   * 존재하는 Flow, Node Data 로 react flow 를 그리기 위해 사용한다.
   *
   * @param {Flow | NodeTypes} origin - 원본 데이터
   * @returns {Object} - 변환된 Node 와 Edge 객체
   */
  static convertToReactFlowNodeEdgeFromOrigin(origin: Flow | NodeTypes): {
    node: Node
    edges: Edge[]
  } {
    const node: Node = {
      id: 'flowId' in origin ? origin.flowId : origin.nodeId,
      type: 'flowId' in origin ? 'flow' : origin.type,
      data: origin.data,
      position: origin.position ?? { x: 0, y: 0 },
      style: {
        width: origin.style?.width ?? DEFAULT_NODE_MIN_WIDTH,
        height: origin.style?.height ?? DEFAULT_NODE_MIN_HEIGHT,
      },
    }
    const edges: Edge[] = []

    if (origin.targets) {
      origin.targets.forEach((target) => {
        edges.push({
          id: nanoid(),
          source: 'flowId' in origin ? origin.flowId : origin.nodeId,
          target: target.id,
          data: {
            label: target.label ?? undefined,
          },
        })
      })
    }
    return {
      node,
      edges,
    }
  }

  /**
   * childFlowIds, childNodeIds 를 인자로 받고 노드와 엣지를 추가한다.
   *
   * 존재하는 Flow, Node Data 로 react flow 를 그리기 위해 사용한다.
   *
   * @param {string[]} ids - 아이디 배열
   * @param {Function} getItem - 아이디로 항목을 가져오는 함수
   * @param {Node[]} creatingNodes - 생성할 노드 배열
   * @param {Node[]} creatingEdges - 생성할 엣지 배열
   */
  static initializeChildNodes(
    ids: string[],
    getItem: (id: string) => Flow | NodeTypes | undefined,
    creatingNodes: Node[],
    creatingEdges: Edge[],
  ) {
    ids.forEach((id) => {
      const item = getItem(id)
      if (item) {
        const { node, edges } =
          FlowDrawer.convertToReactFlowNodeEdgeFromOrigin(item)
        creatingNodes.push(node)
        if (edges.length > 0) {
          edges.forEach((edge) => {
            creatingEdges.push(edge)
          })
        }
      }
    })
  }

  /**
   * 노드 타입에 따라서 디폴트 리액트 플로우 노드(기본값)를 생성합니다.
   */
  static createReactFlowNodeByNodeType({
    nodeType,
    position,
  }: {
    nodeType: NodeType | 'flow'
    position: XYPosition
  }): Node {
    return {
      id: nanoid(),
      type: nodeType,
      data: { title: 'Untitled' },
      position,
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  }

  /**
   * 리액트 플로우 노드를 Flow(기본값) 로 변환합니다.
   */
  static createFlowNodeByReactFlowNode({
    flowId,
    parentFlowId,
    data,
    position,
  }: {
    flowId: string
    parentFlowId: string
    data: FlowNodeData
    position: XYPosition
  }): Flow {
    return {
      flowId,
      created_at: new Date(),
      updated_at: new Date(),
      data,
      position,
      parentFlowId,
      childNodeIds: [],
      childFlowIds: [],
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  }

  /**
   * 리액트 플로우 노드를 Node(기본값) 로 변환합니다.
   */
  static createNodeByReactFlowNode({
    nodeId,
    type,
    parentFlowId,
    data,
    position,
  }: {
    nodeId: string
    type: NodeType
    parentFlowId: string
    data: NodeDataTypes
    position: XYPosition
  }): NodeTypes {
    return {
      nodeId,
      type,
      created_at: new Date(),
      updated_at: new Date(),
      data,
      position,
      parentFlowId,
      style: {
        width: DEFAULT_NODE_MIN_WIDTH,
        height: DEFAULT_NODE_MIN_HEIGHT,
      },
    }
  }

  /**
   * sourceId, targetId 를 받아 react-flow 엣지를 생성하기 위한 데이터를 반환합니다.
   */
  static createEdge({
    sourceId,
    targetId,
  }: {
    sourceId: string
    targetId: string
  }) {
    return {
      id: nanoid(),
      source: sourceId,
      target: targetId,
    }
  }
}

const DEFAULT_NODE_MIN_WIDTH = 150
const DEFAULT_NODE_MIN_HEIGHT = 100

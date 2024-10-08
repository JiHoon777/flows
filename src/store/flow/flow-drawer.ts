import type { DoFlow } from '@/store/flow/do-flow.ts'
import type { IReactFlowNodeTarget, NodeType } from '@/types/base.type.ts'
import type { IFlow } from '@/types/flow.type.ts'
import type { NodeTypes } from '@/types/types.ts'
import type { Edge, EdgeChange, Node, NodeChange, XYPosition } from 'reactflow'

import { action, makeObservable, observable, runInAction } from 'mobx'
import { nanoid } from 'nanoid'
import { applyEdgeChanges, applyNodeChanges } from 'reactflow'

export class FlowDrawer {
  flow: DoFlow

  nodes: Node[] = []
  edges: Edge[] = []

  loaded: boolean = false
  constructor(flow: DoFlow) {
    this.flow = flow

    makeObservable(this, {
      edges: observable,
      loaded: observable,
      nodes: observable,

      onEdgesChange: action,
      onNodesChange: action,
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
      data: { title: 'new Node' },
      id: nanoid(),
      position,
      type: 'text',
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
  async connectNodes(sourceNode: Node, targetNode: Node): Promise<void> {
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

    try {
      isSourceNodeFlow
        ? await this.rootStore.flowStore.updateFlow({
            changedFlow: {
              targets,
            },
            flowId: sourceNode.id,
          })
        : await this.rootStore.nodeStore.updateNode({
            changedNode: {
              targets,
            },
            nodeId: sourceNode.id,
          })
    } catch (ex) {
      this.rootStore.showError(ex)
      restoreOnError()
    }
  }
  async updateEdge(
    edgeId: string,
    updatingEdgeData: Partial<Omit<IReactFlowNodeTarget, 'id'>>,
  ): Promise<void> {
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

    try {
      sourceNode.type === 'flow'
        ? await this.flow.store.updateFlow({
            changedFlow: {
              targets: (
                this.flow.store.getFlowById(sourceNode.id)?.snapshot.targets ??
                []
              ).map((target) =>
                target.id === updatingEdge.target
                  ? { ...target, ...updatingEdgeData }
                  : target,
              ),
            },
            flowId: updatingEdge.source,
          })
        : await this.rootStore.nodeStore.updateNode({
            changedNode: {
              targets: (
                this.rootStore.nodeStore.getNodeById(sourceNode.id)?.snapshot
                  .targets ?? []
              ).map((target) =>
                target.id === updatingEdge.target
                  ? { ...target, ...updatingEdgeData }
                  : target,
              ),
            },
            nodeId: updatingEdge.source,
          })
    } catch (ex) {
      restoreOnError()
      this.rootStore.showError(ex)
    }
  }
  async deleteEdge(edgeId: string): Promise<void> {
    const deletingEdge = this.edges.find((edge) => edge.id === edgeId)

    if (!deletingEdge) {
      return
    }

    const restoreOnError = () => {
      runInAction(() => {
        this.edges.push(deletingEdge)
      })
    }

    runInAction(() => {
      this.edges = this.edges.filter((edge) => edge.id !== edgeId)
    })

    const sourceNode = this.nodes.find(
      (node) => node.id === deletingEdge.source,
    )

    if (!sourceNode) {
      restoreOnError()
      return
    }

    try {
      sourceNode.type === 'flow'
        ? await this.flow.store.updateFlow({
            changedFlow: {
              targets: (
                this.flow.store.getFlowById(sourceNode.id)?.snapshot.targets ??
                []
              ).filter((target) => target.id !== deletingEdge.target),
            },
            flowId: sourceNode.id,
          })
        : await this.rootStore.nodeStore.updateNode({
            changedNode: {
              targets: (
                this.rootStore.nodeStore.getNodeById(sourceNode.id)?.snapshot
                  .targets ?? []
              ).filter((target) => target.id !== deletingEdge.target),
            },
            nodeId: sourceNode.id,
          })
    } catch (ex) {
      restoreOnError()
      this.rootStore.showError(ex)
    }
  }
  /**
   * FlowNode 를 추가하고, Flow 를 저장한다.
   */
  async addFlowNode(position: XYPosition): Promise<void> {
    const reactFlowNode = FlowDrawer.createReactFlowNodeByNodeType({
      nodeType: 'flow',
      position,
    })
    const flow = FlowDrawer.createFlowNodeByReactFlowNode({
      flowId: reactFlowNode.id,
      parentFlowId: this.flow.id,
      position,
    })

    runInAction(() => {
      this.nodes = [...this.nodes, reactFlowNode]
    })

    try {
      await this.flow.createChildFlow(flow)
    } catch (ex) {
      this.rootStore.showError(ex)

      runInAction(() => {
        this.nodes = this.nodes.filter((node) => node.id !== reactFlowNode.id)
      })
    }
  }
  /**
   * Node 를 추가하고, 저장한다.
   */
  async addNode({
    nodeType,
    position,
  }: {
    nodeType: NodeType
    position: XYPosition
  }): Promise<void> {
    const reactFlowNode = FlowDrawer.createReactFlowNodeByNodeType({
      nodeType,
      position,
    })
    const node = FlowDrawer.createNodeByReactFlowNode({
      nodeId: reactFlowNode.id,
      parentFlowId: this.flow.id,
      position,
      type: nodeType,
    })

    runInAction(() => {
      this.nodes = [...this.nodes, reactFlowNode]
    })

    try {
      await this.flow.createChildNode(node)
    } catch (ex) {
      this.rootStore.showError(ex)

      runInAction(() => {
        this.nodes = this.nodes.filter((node) => node.id !== reactFlowNode.id)
      })
    }
  }
  /**
   * 지정된 노드의 레이블을 업데이트합니다.
   *
   * 현재 상태에서 주어진 nodeId를 가진 노드를 찾아 해당 노드의 레이블을 제공된 값으로 업데이트합니다.
   */
  async updateNodeTitle({
    id,
    type,
    title,
  }: {
    id: string
    type: NodeType | 'flow'
    title: string
  }): Promise<void> {
    try {
      type === 'flow'
        ? await this.flow.store.updateFlow({
            changedFlow: {
              title,
            },
            flowId: id,
          })
        : await this.rootStore.nodeStore.updateNode({
            changedNode: {
              title,
            },
            nodeId: id,
          })
    } catch (ex) {
      this.rootStore.showError(ex)
    }
  }
  /**
   * Node 의 포지션을 변경한다.
   */
  async updateNodePosition({
    id,
    type,
    position,
  }: {
    id: string
    type: string
    position: XYPosition
  }): Promise<void> {
    try {
      type === 'flow'
        ? await this.flow.store.updateFlow({
            changedFlow: {
              position,
            },
            flowId: id,
          })
        : await this.rootStore.nodeStore.updateNode({
            changedNode: {
              position,
            },
            nodeId: id,
          })
    } catch (ex) {
      this.rootStore.showError(ex)
    }
  }
  /**
   * Node 를 제거한다.
   * Todo, isTrashed : true 로 변경하고, store 의 map 에서 없애고 app 초기화시에 불러오지 말자.
   * 1. this.nodes 제거
   * 2. 실제 저장된 node의 isTrashed : true 로 변경
   */
  async removeNode(id: string, type: NodeType | 'flow'): Promise<void> {
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

    try {
      type === 'flow'
        ? await this.flow.store.removeFlow(id)
        : await this.rootStore.nodeStore.removeNode(id)
    } catch (ex) {
      this.rootStore.showError(ex)
      restoreOnError()
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
   * @param {IFlow | NodeTypes} origin - 원본 데이터
   * @returns {Object} - 변환된 Node 와 Edge 객체
   */
  static convertToReactFlowNodeEdgeFromOrigin(origin: IFlow | NodeTypes): {
    node: Node
    edges: Edge[]
  } {
    const node: Node = {
      data: undefined,
      id: 'flowId' in origin ? origin.flowId : origin.nodeId,
      position: origin.position ?? { x: 0, y: 0 },
      style: {
        height: origin.style?.height ?? DEFAULT_NODE_MIN_HEIGHT,
        width: origin.style?.width ?? DEFAULT_NODE_MIN_WIDTH,
      },
      type: 'flowId' in origin ? 'flow' : origin.type,
    }
    const edges: Edge[] = []

    if (origin.targets) {
      origin.targets.forEach((target) => {
        edges.push({
          data: {
            label: target.label ?? undefined,
          },
          id: nanoid(),
          source: 'flowId' in origin ? origin.flowId : origin.nodeId,
          target: target.id,
        })
      })
    }
    return {
      edges,
      node,
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
    getItem: (id: string) => IFlow | NodeTypes | undefined,
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
      data: { title: 'Untitled' },
      id: nanoid(),
      position,
      style: {
        height: DEFAULT_NODE_MIN_HEIGHT,
        width: DEFAULT_NODE_MIN_WIDTH,
      },
      type: nodeType,
    }
  }

  /**
   * 리액트 플로우 노드를 Flow(기본값) 로 변환합니다.
   */
  static createFlowNodeByReactFlowNode({
    flowId,
    parentFlowId,
    position,
  }: {
    flowId: string
    parentFlowId: string
    position: XYPosition
  }): IFlow {
    return {
      childFlowIds: [],
      childNodeIds: [],
      created_at: new Date(),
      flowId,
      parentFlowId,
      position,
      style: {
        height: DEFAULT_NODE_MIN_HEIGHT,
        width: DEFAULT_NODE_MIN_WIDTH,
      },
      title: 'Untitled',
      updated_at: new Date(),
    }
  }

  /**
   * 리액트 플로우 노드를 Node(기본값) 로 변환합니다.
   */
  static createNodeByReactFlowNode({
    nodeId,
    type,
    parentFlowId,
    position,
  }: {
    nodeId: string
    type: NodeType
    parentFlowId: string
    position: XYPosition
  }): NodeTypes {
    return {
      created_at: new Date(),
      nodeId,
      parentFlowId,
      position,
      style: {
        height: DEFAULT_NODE_MIN_HEIGHT,
        width: DEFAULT_NODE_MIN_WIDTH,
      },
      title: 'Untitled',
      type,
      updated_at: new Date(),
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

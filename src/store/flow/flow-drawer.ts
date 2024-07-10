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
import { FlowNodeData, NodeType } from '@/store/types.ts'
import { reactFlowUtils } from '@/utils/react-flow.ts'

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

    reactFlowUtils.initializeChildNodes(
      this.flow.snapshot.childFlowIds ?? [],
      (id) => this.flow.store.getFlowById(id)?.snapshot,
      creatingNodes,
      creatingEdges,
    )
    reactFlowUtils.initializeChildNodes(
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

    const creatingEdge = reactFlowUtils.createEdge({
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
  async connectNodes(sourceNode: Node, targetNode: Node) {
    const isSourceNodeFlow = sourceNode.type === 'flow'

    const edgeToCreate = reactFlowUtils.createEdge({
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
    try {
      if (isSourceNodeFlow) {
        await this.rootStore.flowStore.updateFlow({
          flowId: sourceNode.id,
          changedFlow: {
            targets,
          },
        })
      } else {
        await this.rootStore.nodeStore.updateNode({
          nodeId: sourceNode.id,
          changedNode: {
            targets,
          },
        })
      }
    } catch (ex) {
      this.rootStore.showError(ex)

      runInAction(() => {
        this.edges = this.edges.filter((edge) => edge.id !== edgeToCreate.id)
      })
    }
  }
  /**
   * FlowNode 를 추가하고, Flow 를 저장한다.
   */
  async addFlowNode(position: XYPosition) {
    const reactFlowNode = reactFlowUtils.createReactFlowNodeByNodeType({
      nodeType: 'flow',
      position,
    })
    const flow = reactFlowUtils.createFlowNodeByReactFlowNode({
      flowId: reactFlowNode.id,
      parentFlowId: this.flow.id,
      data: reactFlowNode.data as FlowNodeData,
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
  }) {
    const reactFlowNode = reactFlowUtils.createReactFlowNodeByNodeType({
      nodeType,
      position,
    })
    const node = reactFlowUtils.createNodeByReactFlowNode({
      nodeId: reactFlowNode.id,
      type: nodeType,
      parentFlowId: this.flow.id,
      data: reactFlowNode.data,
      position,
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
  }) {
    if (type === 'flow') {
      await this.flow.store.updateFlow({
        flowId: id,
        changedFlow: {
          data: { title },
        },
      })
    } else {
      await this.rootStore.nodeStore.updateNode({
        nodeId: id,
        changedNode: {
          data: { title },
        },
      })
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
  }) {
    if (type === 'flow') {
      await this.flow.store.updateFlow({
        flowId: id,
        changedFlow: {
          position,
        },
      })
    } else {
      await this.rootStore.nodeStore.updateNode({
        nodeId: id,
        changedNode: {
          position,
        },
      })
    }
  }
}

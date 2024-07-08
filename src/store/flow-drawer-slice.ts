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

import { fileSystemAPI } from '@/api/file-system'
import {
  CommonStateCreator,
  FlowDrawerSlice,
  StoreType,
} from '@/store/slice.type'
import { FlowNodeData, NodeType } from '@/store/types'
import { reactFlowUtils } from '@/utils/react-flow'

export const createFlowDrawerSlice: CommonStateCreator<
  StoreType,
  FlowDrawerSlice
> = (set, get) => ({
  //
  // init
  //
  loaded: false,
  initializeFlowDrawer: (parentFlowId: string) => {
    set((state) => {
      state.loaded = false
    })

    const creatingNodes: Node[] = []
    const creatingEdges: Edge[] = []

    const parentFlow = get().flowsMap.get(parentFlowId)
    reactFlowUtils.initializeChildNodes(
      parentFlow?.childFlowIds ?? [],
      (id) => get().flowsMap.get(id),
      creatingNodes,
      creatingEdges,
    )
    reactFlowUtils.initializeChildNodes(
      parentFlow?.childNodeIds ?? [],
      (id) => get().nodesMap.get(id),
      creatingNodes,
      creatingEdges,
    )

    set((state) => {
      state.nodes = creatingNodes
      state.edges = creatingEdges
      state.loaded = true
    })
  },
  //
  // state for draw
  //
  nodes: [],
  edges: [],
  //
  // action
  //
  /**
   * React Flow 노드 데이터를 슬라이스 노드 데이터와 동기화합니다.
   *
   * React Flow 의 onNodesChange 이벤트로부터 변경사항을 로컬 상태 노드에 적용합니다.
   *
   * @param {NodeChange[]} changes - 노드에 적용될 변경사항들.
   **/
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },
  /**
   * React Flow 엣지 데이터를 슬라이스 엣지 데이터와 동기화합니다.
   *
   * React Flow 의 onEdgesChange 이벤트로부터 변경사항을 로컬 상태 엣지에 적용합니다.
   *
   * @param {EdgeChange[]} changes - 엣지에 적용될 변경사항들.
   **/
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },
  /**
   * 지정된 부모 노드에 새로운 자식 노드를 추가하고, 그들 사이에 엣지를 생성합니다.
   *
   * 주어진 위치에 'mindMap' 타입의 새로운 노드를 생성하고, 기본 레이블 'New Node' 를 사용합니다.
   * 그리고 부모 노드와 새로운 노드를 연결하는 엣지를 생성합니다.
   *
   * @param {Node} parentNode - 새로운 노드가 추가될 부모 노드.
   * @param {XYPosition} position - 새로운 노드가 배치될 위치.
   **/
  addChildNode: (parentNode: Node, position: XYPosition) => {
    const newNode = {
      id: nanoid(),
      type: 'mindMap',
      data: { label: 'New Node' },
      position,
    }

    const newEdge = reactFlowUtils.createEdge({
      sourceId: parentNode.id,
      targetId: newNode.id,
    })

    set({
      nodes: [...get().nodes, newNode],
      edges: [...get().edges, newEdge],
    })
  },
  /**
   * 노드를 엣지로 연결합니다.
   */
  connectNodes: async (sourceNode, targetNode) => {
    const isSourceNodeFlow = sourceNode.type === 'flow'

    const edgeToCreate = reactFlowUtils.createEdge({
      sourceId: sourceNode.id,
      targetId: targetNode.id,
    })
    set((state) => {
      state.edges.push(edgeToCreate)
    })

    const flowOrNode = isSourceNodeFlow
      ? get().getFlowById(sourceNode.id)
      : get().getNodeById(sourceNode.id)
    const restoreOnError = () => {
      set((state) => {
        state.edges.filter((edge) => edge.id !== edgeToCreate.id)
      })
    }
    if (isSourceNodeFlow) {
      await get().updateFlow(
        sourceNode.id,
        {
          targets: [...(flowOrNode?.targets ?? []), { id: targetNode.id }],
        },
        {
          onFail: restoreOnError,
        },
      )
    } else {
      await get().updateNode(
        sourceNode.id,
        {
          targets: [...(flowOrNode?.targets ?? []), { id: targetNode.id }],
        },
        {
          onFail: restoreOnError,
        },
      )
    }
  },

  /**
   * FlowNode 를 추가하고, Flow 를 저장한다.
   */
  addFlowNode: async ({
    parentFlowId,
    position,
  }: {
    parentFlowId: string
    position: XYPosition
  }) => {
    const parentFlow = get().getFlowById(parentFlowId)
    if (!parentFlow) {
      return
    }

    const reactFlowNode = reactFlowUtils.createReactFlowNodeByNodeType({
      nodeType: 'flow',
      position,
    })
    const flow = reactFlowUtils.createFlowNodeByReactFlowNode({
      flowId: reactFlowNode.id,
      parentFlowId,
      data: reactFlowNode.data as FlowNodeData,
      position,
    })

    set((state) => {
      state.nodes.push(reactFlowNode)
      state.flowsMap.set(flow.flowId, flow)
      const parentFlow = state.flowsMap.get(parentFlowId)!
      parentFlow.childFlowIds = [
        ...(parentFlow.childFlowIds ?? []),
        flow.flowId,
      ]
    })

    try {
      await fileSystemAPI.saveFlowToFile(flow)
      await fileSystemAPI.saveFlowToFile({
        ...parentFlow,
        updated_at: new Date(),
        childFlowIds: [...(parentFlow.childFlowIds ?? []), flow.flowId],
      })
    } catch (ex) {
      console.error(ex)
      set((state) => {
        state.nodes = state.nodes.filter((node) => node.id !== reactFlowNode.id)
        state.flowsMap.delete(flow.flowId)
        const parentFlow = state.flowsMap.get(parentFlowId)!

        parentFlow.childFlowIds = (parentFlow.childFlowIds ?? []).filter(
          (id) => id !== flow.flowId,
        )
      })
    }
  },

  /**
   * Node 를 추가하고, 저장한다.
   */
  addNode: async ({
    parentFlowId,
    nodeType,
    position,
  }: {
    parentFlowId: string
    nodeType: NodeType
    position: XYPosition
  }) => {
    const parentFlow = get().getFlowById(parentFlowId)
    if (!parentFlow) {
      return
    }

    const reactFlowNode = reactFlowUtils.createReactFlowNodeByNodeType({
      nodeType,
      position,
    })
    const node = reactFlowUtils.createNodeByReactFlowNode({
      nodeId: reactFlowNode.id,
      type: nodeType,
      parentFlowId,
      data: reactFlowNode.data,
      position,
    })
    set((state) => {
      state.nodes.push(reactFlowNode)
      state.nodesMap.set(node.nodeId, node)
      const parentFlow = state.flowsMap.get(parentFlowId)!
      parentFlow.childNodeIds.push(node.nodeId)
    })

    try {
      await fileSystemAPI.saveNodeToFile(node)
      await fileSystemAPI.saveFlowToFile({
        ...parentFlow,
        updated_at: new Date(),
        childNodeIds: [...(parentFlow.childNodeIds ?? []), node.nodeId],
      })
    } catch (ex) {
      console.error(ex)
      set((state) => {
        state.nodes = state.nodes.filter((node) => node.id !== reactFlowNode.id)
        state.nodesMap.delete(node.nodeId)
        const parentFlow = state.flowsMap.get(parentFlowId)!

        parentFlow.childNodeIds = parentFlow.childNodeIds.filter(
          (id) => id !== node.nodeId,
        )
      })
    }
  },
  /**
   * 지정된 노드의 레이블을 업데이트합니다.
   *
   * 현재 상태에서 주어진 nodeId를 가진 노드를 찾아 해당 노드의 레이블을 제공된 값으로 업데이트합니다.
   *
   **/
  updateNodeTitle: async (id, type, title) => {
    if (type === 'flow') {
      await get().updateFlow(id, { data: { title } })
    } else {
      await get().updateNode(id, { data: { title } })
    }
  },
  updateNodePosition: async ({ id, type, position }) => {
    if (type === 'flow') {
      await get().updateFlow(id, { position })
    } else {
      await get().updateNode(id, { position })
    }
  },
})

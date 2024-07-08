import { Edge, Node, OnEdgesChange, OnNodesChange, XYPosition } from 'reactflow'
import { StateCreator } from 'zustand'

import {
  Flow,
  FlowNodeData,
  NodeDataTypes,
  NodeType,
  NodeTypes,
} from '@/store/types'

export type CommonStateCreator<STORE_TYPE, SLICE_TYPE> = StateCreator<
  STORE_TYPE,
  [['zustand/immer', never]],
  [],
  SLICE_TYPE
>

export interface FlowSlice {
  flowsMap: Map<string, Flow>

  updateFlow: (
    nodeId: string,
    changedFlow: Partial<Omit<Flow, 'data'>> & {
      data?: Partial<FlowNodeData>
    },
    options?: {
      onFail?: () => void
    },
  ) => Promise<void>

  getFlowById: (id: string) => Flow | undefined
}

export interface NodeSlice {
  nodesMap: Map<string, NodeTypes>

  updateNode: (
    nodeId: string,
    changedNode: Partial<Omit<NodeTypes, 'data'>> & {
      data?: Partial<NodeDataTypes>
    },
    options?: {
      onFail?: () => void
    },
  ) => Promise<void>

  getNodeById: (id: string) => NodeTypes | undefined
}

export interface FlowDrawerSlice {
  loaded: boolean
  initializeFlowDrawer: (flowId: string) => void

  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  addChildNode: (sourceNode: Node, position: XYPosition) => void
  connectNodes: (sourceNode: Node, targetNode: Node) => void
  updateNodeTitle: (
    nodeId: string,
    type: NodeType | 'flow',
    title: string,
  ) => Promise<void>
  updateNodePosition: (node: Node) => Promise<void>
  addNode: (data: {
    parentFlowId: string
    nodeType: NodeType
    position: XYPosition
  }) => Promise<void>
  addFlowNode: (data: {
    parentFlowId: string
    position: XYPosition
  }) => Promise<void>
}

export type StoreType = {
  appLoaded: boolean
  initialize: () => Promise<void>
} & FlowSlice &
  NodeSlice &
  FlowDrawerSlice

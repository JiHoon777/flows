interface EditableItemBase {
  created_at: Date
  updated_at: Date
  isTrashed?: boolean
}

interface ReactFlowNodeTarget {
  id: string
}

interface ReactFlowNodeBase<DATA_TYPE> {
  data: DATA_TYPE

  targets?: ReactFlowNodeTarget[]
  parentFlowId?: string

  position?: {
    x: number
    y: number
  }
  style?: {
    width: number
    height: number
  }
}

//
// Flow 는 루트 Flow 를 제외하고 노드가 될 수 있다.
//
export interface Flow
  extends EditableItemBase,
    ReactFlowNodeBase<FlowNodeData> {
  flowId: string

  childNodeIds: string[]

  childFlowIds?: string[]
}

export type NodeType = 'text' | 'note'

interface NodeBase<DATA_TYPE>
  extends EditableItemBase,
    ReactFlowNodeBase<DATA_TYPE> {
  nodeId: string
  type: NodeType
}

//
// Common Node Data
//
interface CommonNodeData {
  title: string
}

//
// Flow Node
//
export interface FlowNodeData extends CommonNodeData {}

//
// Card Node
//
export interface TextNodeData extends CommonNodeData {}
export interface TextNode extends NodeBase<CommonNodeData> {
  type: 'text'
}

//
// Note Node
//
export interface NoteNodeData extends CommonNodeData {
  content?: string // JSON
}
export interface NoteNode extends NodeBase<NoteNodeData> {
  type: 'note'
}

//
// Node Types Union
//
export type NodeDataTypes = TextNodeData | NoteNodeData
export type NodeTypes = TextNode | NoteNode

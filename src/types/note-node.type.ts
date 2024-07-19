//
// Note Node
//
import { CommonNodeData, NodeBase } from '@/types/base.type.ts'

export interface NoteNodeData extends CommonNodeData {
  content?: string // JSON
}

export interface NoteNode extends NodeBase<NoteNodeData> {
  type: 'note'
}

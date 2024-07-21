//
// Note Node
//
import { NodeBase } from '@/types/base.type.ts'

export interface NoteNode extends NodeBase {
  type: 'note'
  title: string
  content?: string
}

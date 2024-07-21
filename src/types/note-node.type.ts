//
// Note Node
//
import { INodeBase } from '@/types/base.type.ts'

export interface INoteNode extends INodeBase {
  type: 'note'
  title: string
  content?: string
}

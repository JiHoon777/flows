//
// Card Node
//
import { NodeBase } from '@/types/base.type.ts'

export interface TextNode extends NodeBase {
  type: 'text'
  title: string
}

//
// Card Node
//
import { INodeBase } from '@/types/base.type.ts'

export interface ITextNode extends INodeBase {
  type: 'text'
  title: string
}

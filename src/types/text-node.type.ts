//
// Card Node
//
import { CommonNodeData, NodeBase } from '@/types/base.type.ts'

export interface TextNodeData extends CommonNodeData {}

export interface TextNode extends NodeBase<CommonNodeData> {
  type: 'text'
}

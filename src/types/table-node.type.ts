import { CommonNodeData, NodeBase } from '@/types/base.type.ts'

export interface TableNodeData extends CommonNodeData {}

export interface TableNode extends NodeBase<TableNodeData> {
  type: 'table'
}

import { NodeBase } from '@/types/base.type.ts'

export interface TableNode extends NodeBase {
  type: 'table'
  title: string
}

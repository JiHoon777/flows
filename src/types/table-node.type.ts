import type { INodeBase } from '@/types/base.type.ts'

export interface ITableNode extends INodeBase {
  type: 'table'
  title: string
}

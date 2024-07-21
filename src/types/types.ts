import { IKanbanNode } from '@/types/kanban-node.type.ts'
import { INoteNode } from '@/types/note-node.type.ts'
import { ITableNode } from '@/types/table-node.type.ts'
import { ITextNode } from '@/types/text-node.type.ts'

//
// Node Types Union
//
export type NodeTypes = ITextNode | INoteNode | ITableNode | IKanbanNode

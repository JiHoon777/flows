import type { IKanbanNode } from '@/types/kanban-node.type.ts'
import type { INoteNode } from '@/types/note-node.type.ts'
import type { ITableNode } from '@/types/table-node.type.ts'
import type { ITextNode } from '@/types/text-node.type.ts'

//
// Node Types Union
//
export type NodeTypes = ITextNode | INoteNode | ITableNode | IKanbanNode

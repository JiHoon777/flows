import { KanbanNode } from '@/types/kanban-node.type.ts'
import { NoteNode } from '@/types/note-node.type.ts'
import { TableNode } from '@/types/table-node.type.ts'
import { TextNode } from '@/types/text-node.type.ts'

//
// Node Types Union
//
export type NodeTypes = TextNode | NoteNode | TableNode | KanbanNode

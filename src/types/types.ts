import { KanbanNode, KanbanNodeData } from '@/types/kanban-node.type.ts'
import { NoteNode, NoteNodeData } from '@/types/note-node.type.ts'
import { TableNode, TableNodeData } from '@/types/table-node.type.ts'
import { TextNode, TextNodeData } from '@/types/text-node.type.ts'

//
// Node Types Union
//
export type NodeDataTypes =
  | TextNodeData
  | NoteNodeData
  | TableNodeData
  | KanbanNodeData
export type NodeTypes = TextNode | NoteNode | TableNode | KanbanNode

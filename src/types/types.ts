import { NoteNode, NoteNodeData } from '@/types/note-node.type.ts'
import { TableNode, TableNodeData } from '@/types/table-node.type.ts'
import { TextNode, TextNodeData } from '@/types/text-node.type.ts'

//
// Node Types Union
//
export type NodeDataTypes = TextNodeData | NoteNodeData | TableNodeData
export type NodeTypes = TextNode | NoteNode | TableNode

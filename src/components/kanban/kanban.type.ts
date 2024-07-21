export interface IKanbanColumn {
  id: string
  title: string
  cardIds: string[]
}

export interface IKanbanCard {
  id: string
  content: string
  nodeReference?: string // Reference to an external node
}

export interface IKanbanData {
  columns: IKanbanColumn[]
  cards: { [key: string]: IKanbanCard }
}

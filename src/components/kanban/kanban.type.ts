// Types
export interface ColumnType {
  id: string
  title: string
}

export interface TaskType {
  id: string
  columnId: string
  content: string
}

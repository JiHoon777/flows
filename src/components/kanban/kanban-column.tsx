import type { IKanbanCard, IKanbanColumn } from './kanban.type'
import type { ReactNode } from 'react'

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { KanbanCard } from '@/components/kanban/kanban-card.tsx'

interface ColumnProps {
  column: IKanbanColumn
  cards: IKanbanCard[]
  renderCard?: (data: IKanbanCard) => ReactNode
}

export function KanbanColumn({ column, cards, renderCard }: ColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    data: {
      column,
      type: 'Column',
    },
    id: column.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mr-4 w-80 shrink-0 rounded-lg bg-gray-100 p-4 shadow-md ${isDragging ? 'opacity-50' : ''}`}
    >
      <h2 className="mb-4 cursor-move font-bold" {...attributes} {...listeners}>
        {column.title}
      </h2>
      <SortableContext
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} renderCard={renderCard} />
        ))}
      </SortableContext>
    </div>
  )
}

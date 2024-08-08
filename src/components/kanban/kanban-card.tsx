import type { IKanbanCard } from './kanban.type'
import type { ReactNode } from 'react'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TaskProps {
  card: IKanbanCard
  isDragging?: boolean
  renderCard?: (data: IKanbanCard) => ReactNode
}

export function KanbanCard({ card, isDragging, renderCard }: TaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      data: {
        card,
        type: 'Card',
      },
      id: card.id,
    })

  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-2 cursor-move rounded-md bg-white p-4 shadow-sm"
    >
      {renderCard ? renderCard(card) : card.content}
    </div>
  )
}

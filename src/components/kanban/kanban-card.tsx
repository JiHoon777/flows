import { ReactNode } from 'react'

import { IKanbanCard } from './kanban.type'
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
      id: card.id,
      data: {
        type: 'Card',
        card,
      },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

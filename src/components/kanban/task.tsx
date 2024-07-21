import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { TaskType } from '@/components/kanban/kanban.type.ts'

// Task Component
interface TaskProps {
  task: TaskType
  isDragging?: boolean
}

export function Task({ task, isDragging }: TaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: task.id,
      data: {
        type: 'Task',
        task,
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
      {task.content}
    </div>
  )
}

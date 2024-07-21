import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { ColumnType, TaskType } from '@/components/kanban/kanban.type.ts'
import { Task } from '@/components/kanban/task.tsx'

interface ColumnProps {
  column: ColumnType
  tasks: TaskType[]
}

export function Column({ column, tasks }: ColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mr-4 w-80 rounded-lg bg-gray-100 p-4 shadow-md ${isDragging ? 'opacity-50' : ''}`}
    >
      <h2 className="mb-4 cursor-move font-bold" {...attributes} {...listeners}>
        {column.title}
      </h2>
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <Task key={task.id} task={task} />
        ))}
      </SortableContext>
    </div>
  )
}

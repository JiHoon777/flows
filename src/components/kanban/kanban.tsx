import { useCallback, useState } from 'react'

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Types
interface ColumnType {
  id: string
  title: string
}

interface TaskType {
  id: string
  columnId: string
  content: string
}

// Task Component
interface TaskProps {
  task: TaskType
  isDragging?: boolean
}

function Task({ task, isDragging }: TaskProps) {
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

// Column Component
interface ColumnProps {
  column: ColumnType
  tasks: TaskType[]
}

function Column({ column, tasks }: ColumnProps) {
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

// Main KanbanBoard Component
export function KanbanBoard() {
  const [columns, setColumns] = useState<ColumnType[]>([
    { id: 'todo', title: 'Todo' },
    { id: 'doing', title: 'Work in progress' },
    { id: 'done', title: 'Done' },
  ])

  const [tasks, setTasks] = useState<TaskType[]>([
    { id: 'task1', columnId: 'todo', content: 'Task 1' },
    { id: 'task2', columnId: 'todo', content: 'Task 2' },
    { id: 'task3', columnId: 'doing', content: 'Task 3' },
    { id: 'task4', columnId: 'done', content: 'Task 4' },
  ])

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const isActiveATask = active.data.current?.type === 'Task'
    const isOverATask = over.data.current?.type === 'Task'

    if (!isActiveATask) return

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId)
        const overIndex = tasks.findIndex((t) => t.id === overId)

        if (tasks[activeIndex].columnId != tasks[overIndex].columnId) {
          tasks[activeIndex].columnId = tasks[overIndex].columnId
          return arrayMove(tasks, activeIndex, overIndex - 1)
        }

        return arrayMove(tasks, activeIndex, overIndex)
      })
    }

    const isOverAColumn = over.data.current?.type === 'Column'

    // Dropping a Task over a column
    if (isActiveATask && isOverAColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId)

        tasks[activeIndex].columnId = overId
        return arrayMove(tasks, activeIndex, activeIndex)
      })
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const isActiveAColumn = active.data.current?.type === 'Column'

    if (isActiveAColumn) {
      setColumns((columns) => {
        const activeColumnIndex = columns.findIndex(
          (col) => col.id === activeId,
        )
        const overColumnIndex = columns.findIndex((col) => col.id === overId)
        return arrayMove(columns, activeColumnIndex, overColumnIndex)
      })
    }

    setActiveId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex p-4">
        <SortableContext
          items={columns.map((col) => col.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={tasks.filter((task) => task.columnId === column.id)}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeId ? (
          tasks.find((task) => task.id === activeId) ? (
            <Task
              task={tasks.find((task) => task.id === activeId) as TaskType}
              isDragging
            />
          ) : (
            <Column
              column={columns.find((col) => col.id === activeId) as ColumnType}
              tasks={tasks.filter((task) => task.columnId === activeId)}
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

import { useCallback, useState } from 'react'

import { IKanbanColumn, IKanbanData } from './kanban.type'
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
} from '@dnd-kit/sortable'

import { Column } from '@/components/kanban/column.tsx'
import { Task } from '@/components/kanban/task.tsx'

export const KanbanBoard = () => {
  const [kanbanData, setKanbanData] = useState<IKanbanData>({
    columns: [
      { id: 'todo', title: 'Todo', cardIds: ['task1', 'task2'] },
      { id: 'doing', title: 'Work in progress', cardIds: ['task3'] },
      { id: 'done', title: 'Done', cardIds: ['task4'] },
    ],
    cards: {
      task1: { id: 'task1', content: 'Task 1' },
      task2: { id: 'task2', content: 'Task 2' },
      task3: { id: 'task3', content: 'Task 3' },
      task4: { id: 'task4', content: 'Task 4' },
    },
  })

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

    const isActiveACard = active.data.current?.type === 'Card'
    const isOverACard = over.data.current?.type === 'Card'
    const isOverAColumn = over.data.current?.type === 'Column'

    if (!isActiveACard) return

    setKanbanData((prev) => {
      const newData = { ...prev }

      // Find the source and destination columns
      const sourceColumn = newData.columns.find((col) =>
        col.cardIds.includes(activeId),
      )!
      const destColumn = isOverACard
        ? newData.columns.find((col) => col.cardIds.includes(overId))!
        : newData.columns.find((col) => col.id === overId)!

      if (sourceColumn.id === destColumn.id) {
        // Moving within the same column
        sourceColumn.cardIds = arrayMove(
          sourceColumn.cardIds,
          sourceColumn.cardIds.indexOf(activeId),
          sourceColumn.cardIds.indexOf(overId),
        )
      } else {
        // Moving to a different column
        sourceColumn.cardIds = sourceColumn.cardIds.filter(
          (id) => id !== activeId,
        )
        if (isOverACard) {
          const overIndex = destColumn.cardIds.indexOf(overId)
          destColumn.cardIds.splice(overIndex, 0, activeId)
        } else if (isOverAColumn) {
          destColumn.cardIds.push(activeId)
        }
      }

      return newData
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const isActiveAColumn = active.data.current?.type === 'Column'

    if (isActiveAColumn) {
      setKanbanData((prev) => {
        const oldIndex = prev.columns.findIndex((col) => col.id === activeId)
        const newIndex = prev.columns.findIndex((col) => col.id === overId)
        return {
          ...prev,
          columns: arrayMove(prev.columns, oldIndex, newIndex),
        }
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
          items={kanbanData.columns.map((col) => col.id)}
          strategy={horizontalListSortingStrategy}
        >
          {kanbanData.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              cards={column.cardIds.map((id) => kanbanData.cards[id])}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeId ? (
          kanbanData.cards[activeId] ? (
            <Task card={kanbanData.cards[activeId]} isDragging />
          ) : (
            <Column
              column={
                kanbanData.columns.find(
                  (col) => col.id === activeId,
                ) as IKanbanColumn
              }
              cards={
                kanbanData.columns
                  .find((col) => col.id === activeId)
                  ?.cardIds.map((id) => kanbanData.cards[id]) || []
              }
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

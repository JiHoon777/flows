import type { IKanbanCard, IKanbanColumn, IKanbanData } from './kanban.type'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import type { ReactNode } from 'react'

import {
  closestCorners,
  DndContext,
  DragOverlay,
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
import { nanoid } from 'nanoid'
import { useCallback, useState } from 'react'

import { KanbanCard } from '@/components/kanban/kanban-card.tsx'
import { KanbanColumn } from '@/components/kanban/kanban-column.tsx'
import { useDidUpdate } from '@/hooks/use-did-update.ts'

export const KanbanBoard = ({
  data,
  onChange,
  renderCard,
}: {
  data: IKanbanData
  onChange: (changed: IKanbanData) => void
  renderCard?: (data: IKanbanCard) => ReactNode
}) => {
  const [kanbanData, setKanbanData] = useState<IKanbanData>(data)

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

  const addNewColumn = useCallback(() => {
    setKanbanData((prev) => ({
      ...prev,
      columns: [
        ...prev.columns,
        { cardIds: [], id: nanoid(), title: 'New Column' },
      ],
    }))
  }, [])

  useDidUpdate(() => {
    onChange(kanbanData)
  }, [kanbanData])

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
            <KanbanColumn
              key={column.id}
              column={column}
              cards={column.cardIds.map((id) => kanbanData.cards[id])}
              renderCard={renderCard}
            />
          ))}
        </SortableContext>
        <div
          className="ml-4 flex min-w-[280px] cursor-pointer items-center justify-center rounded-lg bg-background shadow-lg"
          onClick={addNewColumn}
        >
          <span onClick={addNewColumn}>+ Add column</span>
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          kanbanData.cards[activeId] ? (
            <KanbanCard
              card={kanbanData.cards[activeId]}
              isDragging
              renderCard={renderCard}
            />
          ) : (
            <KanbanColumn
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
              renderCard={renderCard}
            />
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

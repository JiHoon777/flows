import React from 'react'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { cn } from '@/utils/cn'

type NodeContentProps = {
  selected: boolean
  dragging: boolean
  title: string
  onTitleChange: (value: string) => void
  children: React.ReactNode
}

export const NodeContent: React.FC<NodeContentProps> = ({
  selected,
  dragging,
  title,
  onTitleChange,
  children,
}) => {
  return (
    <div className="border-border border border-dashed z-[1] relative w-full flex flex-col items-center gap-3">
      <div
        className={cn(
          'relative flex flex-col items-center w-full h-full px-2 pt-2',
          'overflow-x-hidden overflow-y-auto scrollbar-hide',
          selected && 'nowheel',
        )}
      >
        <FlTextareaAutoSize
          className={cn(
            'nodrag shrink-0 p-2 text-4xl w-full resize-none mx-2 mt-2 font-bold border-0 shadow-none',
            (!selected || dragging) && 'pointer-events-none',
            selected && dragging && 'pointer-events-none',
            'overflow-hidden',
          )}
          defaultValue={title}
          onChange={(e) => onTitleChange(e.target.value)}
          draggable
        />
        {children}
      </div>
    </div>
  )
}

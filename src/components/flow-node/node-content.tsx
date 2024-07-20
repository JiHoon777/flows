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
    <div className="relative z-[1] flex w-full flex-col items-center gap-3 border border-dashed border-border">
      <div
        className={cn(
          'relative flex h-full w-full flex-col items-center px-2 pt-2',
          'overflow-y-auto overflow-x-hidden scrollbar-hide',
          selected && 'nowheel',
        )}
      >
        <FlTextareaAutoSize
          className={cn(
            'nodrag mx-2 mt-2 w-full shrink-0 resize-none border-0 p-2 text-4xl font-bold shadow-none',
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

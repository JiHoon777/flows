import * as React from 'react'
import { Dispatch } from 'react'

import { observer } from 'mobx-react'

import { cn } from '@/utils/cn.ts'

interface ContextMenuItem {
  type?: 'item'
  label: string
  leftIcon?: React.ReactNode
  command?: (data: { contextMenuPosition: { x: number; y: number } }) => void
  disabled?: boolean
}

interface ContextMenuSeparatorItem {
  type: 'separator'
}

export type ContextMenuItems = ContextMenuItem | ContextMenuSeparatorItem

export const ContextMenuItem = observer(
  ({
    item,
    index,
    activeIndex,
    setActiveIndex,
    setIsVisible,
    menuPosition,
  }: {
    item: ContextMenuItems
    index: number
    activeIndex: number
    setActiveIndex: Dispatch<number>
    setIsVisible: Dispatch<boolean>
    menuPosition: { x: number; y: number }
  }) => {
    if (item.type === 'separator') {
      return <div key={index} className="my-1 h-px bg-gray-200" />
    }

    return (
      <div
        key={index}
        onClick={() => {
          if (!item.disabled && item.command) {
            item.command({ contextMenuPosition: menuPosition })
            setIsVisible(false)
          }
        }}
        tabIndex={0}
        data-index={index}
        className={cn(
          `flex items-center rounded px-3 py-1 text-[0.8rem] focus:outline-none`,
          item.disabled
            ? 'cursor-default text-gray-400'
            : 'cursor-pointer text-black',
          index === activeIndex && 'bg-blue-400 text-white',
        )}
        onMouseEnter={() => setActiveIndex(index)}
      >
        {item.leftIcon && (
          <span className="mr-2 inline-flex w-5 items-center justify-center">
            {item.leftIcon}
          </span>
        )}
        {item.label}
      </div>
    )
  },
)

import { Dispatch, ReactNode } from 'react'

import { Check } from 'lucide-react'

import { cn } from '@/utils/cn.ts'

interface MenuItem {
  type?: 'item'
  label: string
  leftIcon?: ReactNode
  checked?: boolean
  command?: (data: { contextMenuPosition: { x: number; y: number } }) => void
  disabled?: boolean
}

interface MenuSeparatorItem {
  type: 'separator'
}

export type MenuItems = MenuItem | MenuSeparatorItem

export const MenuItem = ({
  item,
  index,
  activeIndex,
  setActiveIndex,
  setIsVisible,
  menuPosition,
}: {
  item: MenuItems
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
        `flex items-center gap-2 rounded py-1 pl-1.5 pr-3 text-[0.8rem] focus:outline-none`,
        item.disabled
          ? 'cursor-default text-gray-400'
          : 'cursor-pointer text-secondary-foreground',
        index === activeIndex && 'bg-blue-400 text-white',
      )}
      onMouseEnter={() => setActiveIndex(index)}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">
        {item.leftIcon}
      </span>
      {item.label}
      <div className={'ml-auto h-4 w-4'}>
        {item.checked && <Check className={'h-full w-full'} />}
      </div>
    </div>
  )
}

import { memo, ReactNode, useEffect, useRef } from 'react'

import { Portal } from '@/components/portal'
import { cn } from '@/utils/cn'

type Props = {
  isOpen: boolean
  position?: { x: number; y: number } | null
  menuItems: MenuItem[]
  onClose: () => void
}

export interface MenuItem {
  leftIcon: ReactNode
  text: string
  onClick: () => void
}

// shadcn / ui 의 컨텍스트 메뉴를 사용 못하여 만든 컴포넌트 react-flow 의 빈 공간에 우클릭을 할 때만 사용하고,
// 그 외는 가능하면 shadcn / ui 를 사용하도록한다.
export const FlowContextMenuContent = memo(
  ({ isOpen, position, menuItems, onClose }: Props) => {
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          onClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('click', handleClickOutside)
      }
    }, [onClose])

    return (
      <Portal>
        <div
          ref={ref}
          className={cn(
            'fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            !isOpen && 'hidden',
          )}
          style={{ left: position?.x, top: position?.y }}
          onContextMenu={(e) => {
            e.preventDefault()
          }}
        >
          {menuItems.map((item) => (
            <div
              key={item.text}
              className={
                'relative gap-2 flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground'
              }
              onClick={() => {
                onClose()
                item.onClick()
              }}
            >
              {item.leftIcon && <div>{item.leftIcon}</div>}
              {item.text}
            </div>
          ))}
        </div>
      </Portal>
    )
  },
)

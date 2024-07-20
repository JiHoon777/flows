import * as React from 'react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { observer } from 'mobx-react'

import {
  ContextMenuItem,
  ContextMenuItems,
} from '@/components/context-menu/context-menu-item.tsx'
import { Portal } from '@/components/portal.tsx'
import { useOutsideClick } from '@/hooks/use-outside-click.ts'
import { cn } from '@/utils/cn.ts'

interface ContextMenuProps {
  model: Array<ContextMenuItems>
}

type ContextMenuModel = ContextMenuProps['model']

interface ContextMenuRef {
  show: (event: React.MouseEvent | TouchEvent) => void
}

const ContextMenu = observer(
  forwardRef<ContextMenuRef, ContextMenuProps>(({ model }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [activeIndex, setActiveIndex] = useState(-1)

    const menuRef = useRef<HTMLDivElement | null>(null)

    useOutsideClick(menuRef, () => setIsVisible(false))

    useImperativeHandle(ref, () => ({
      show: (event: React.MouseEvent | TouchEvent) => {
        event.preventDefault()

        const isTouchEvent = 'touches' in event
        const x = isTouchEvent ? event.touches[0].clientX : event.clientX
        const y = isTouchEvent ? event.touches[0].clientY : event.clientY

        setPosition({ x, y })
        setIsVisible(true)
        setActiveIndex(-1)
      },
    }))

    useEffect(() => {
      if (!isVisible || !menuRef?.current) {
        return
      }

      const getNextValidIndex = (
        currentIndex: number,
        direction: 'next' | 'prev',
      ): number => {
        let nextIndex = currentIndex
        do {
          nextIndex =
            direction === 'next'
              ? (nextIndex + 1) % model.length
              : (nextIndex - 1 + model.length) % model.length
        } while (
          model[nextIndex].type === 'separator' &&
          nextIndex !== currentIndex
        )

        console.log(nextIndex)
        return nextIndex
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            setActiveIndex((prevIndex) => getNextValidIndex(prevIndex, 'next'))
            break
          case 'ArrowUp':
            event.preventDefault()
            setActiveIndex((prevIndex) => getNextValidIndex(prevIndex, 'prev'))
            break
          case 'Enter':
            if (activeIndex >= 0 && activeIndex < model.length) {
              const item = model[activeIndex]
              if (item.type !== 'separator' && !item.disabled && item.command) {
                item.command({
                  contextMenuPosition: position,
                })
                setIsVisible(false)
              }
            }
            break
          case 'Escape':
            setIsVisible(false)
            break
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [activeIndex, isVisible, model])

    if (!isVisible) return null

    return (
      <Portal>
        <div
          ref={menuRef}
          className={cn(
            'fixed z-50 rounded-lg bg-gray-200',
            'bg-opacity-80 p-2 py-1 shadow-lg backdrop-blur-xl',
          )}
          style={{ top: position.y, left: position.x }}
        >
          {model.map((item, index) => (
            <ContextMenuItem
              key={index}
              item={item}
              index={index}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              setIsVisible={setIsVisible}
              menuPosition={position}
            />
          ))}
        </div>
      </Portal>
    )
  }),
)
export { ContextMenu }
export type { ContextMenuProps, ContextMenuModel, ContextMenuRef }

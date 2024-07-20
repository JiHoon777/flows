import * as React from 'react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { cva, VariantProps } from 'class-variance-authority'
import { observer } from 'mobx-react'

import {
  ContextMenuItem,
  ContextMenuItems,
} from '@/components/menu/menu-item.tsx'
import { Portal } from '@/components/portal.tsx'
import { useOutsideClick } from '@/hooks/use-outside-click.ts'
import { cn } from '@/utils/cn.ts'

const menuVariants = cva(
  cn(
    'fixed z-50 rounded-lg bg-secondary bg-opacity-80 px-1.5 py-1.5 shadow-lg backdrop-blur-xl',
  ),
  {
    variants: {
      variant: {
        dropdown: '',
        contextMenu: '',
      },
    },
  },
)

type MenuProps = {
  model: Array<ContextMenuItems>
} & VariantProps<typeof menuVariants>

type MenuModel = MenuProps['model']

type MenuRef = {
  show: (event: React.MouseEvent | TouchEvent) => void
  close: () => void
}

const Menu = observer(
  forwardRef<MenuRef, MenuProps>(({ model, variant }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [activeIndex, setActiveIndex] = useState(-1)

    const menuRef = useRef<HTMLDivElement | null>(null)

    useOutsideClick(menuRef, () => setIsVisible(false), isVisible)

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
      close: () => {
        setIsVisible(false)
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
    }, [activeIndex, isVisible, model, position])

    if (!isVisible) return null

    return (
      <Portal>
        <div
          ref={menuRef}
          className={cn(menuVariants({ variant }))}
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
export { Menu }
export type { MenuProps, MenuModel, MenuRef }

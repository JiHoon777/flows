import { DragEvent as ReactDragEvent, useEffect, useRef, useState } from 'react'

import { eventFiles } from '@lexical/rich-text'
import { calculateZoomLevel, mergeRegister } from '@lexical/utils'
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
} from 'lexical'
import { GripVertical } from 'lucide-react'

import {
  getBlockElement,
  hideTargetLine,
  isOnMenu,
  setDragImage,
  setMenuPosition,
  setTargetLine,
} from '@/components/lexical/plugins/draggable-block-plugin/utils.ts'
import { isHTMLElement } from '@/components/lexical/utils/is-html-element.ts'
import { Portal } from '@/components/portal.tsx'
import { cn } from '@/utils/cn.ts'

const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block'

export const useDraggableBlockMenu = (
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isEditable: boolean,
) => {
  const scrollerElem = anchorElem.parentElement

  const menuRef = useRef<HTMLDivElement>(null)
  const targetLineRef = useRef<HTMLDivElement>(null)
  const isDraggingBlockRef = useRef<boolean>(false)
  const [draggableBlockElem, setDraggableBlockElem] =
    useState<HTMLElement | null>(null)

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target
      if (!isHTMLElement(target)) {
        setDraggableBlockElem(null)
        return
      }

      if (isOnMenu(target)) {
        return
      }

      const _draggableBlockElem = getBlockElement(anchorElem, editor, event)

      setDraggableBlockElem(_draggableBlockElem)
    }

    function onMouseLeave() {
      setDraggableBlockElem(null)
    }

    scrollerElem?.addEventListener('mousemove', onMouseMove)
    scrollerElem?.addEventListener('mouseleave', onMouseLeave)

    return () => {
      scrollerElem?.removeEventListener('mousemove', onMouseMove)
      scrollerElem?.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [scrollerElem, anchorElem, editor])

  useEffect(() => {
    if (menuRef.current) {
      setMenuPosition(draggableBlockElem, menuRef.current, anchorElem)
    }
  }, [anchorElem, draggableBlockElem])

  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false
      }
      const [isFileTransfer] = eventFiles(event)
      if (isFileTransfer) {
        return false
      }
      const { pageY, target } = event
      if (!isHTMLElement(target)) {
        return false
      }
      const targetBlockElem = getBlockElement(anchorElem, editor, event, true)
      const targetLineElem = targetLineRef.current
      if (targetBlockElem === null || targetLineElem === null) {
        return false
      }
      setTargetLine(
        targetLineElem,
        targetBlockElem,
        pageY / calculateZoomLevel(target),
        anchorElem,
      )
      // Prevent default event to be able to trigger onDrop events
      event.preventDefault()
      return true
    }

    function $onDrop(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false
      }
      const [isFileTransfer] = eventFiles(event)
      if (isFileTransfer) {
        return false
      }
      const { target, dataTransfer, pageY } = event
      const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) || ''
      const draggedNode = $getNodeByKey(dragData)
      if (!draggedNode) {
        return false
      }
      if (!isHTMLElement(target)) {
        return false
      }
      const targetBlockElem = getBlockElement(anchorElem, editor, event, true)
      if (!targetBlockElem) {
        return false
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem)
      if (!targetNode) {
        return false
      }
      if (targetNode === draggedNode) {
        return true
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top
      if (pageY / calculateZoomLevel(target) >= targetBlockElemTop) {
        targetNode.insertAfter(draggedNode)
      } else {
        targetNode.insertBefore(draggedNode)
      }
      setDraggableBlockElem(null)

      return true
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          return onDragover(event)
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          return $onDrop(event)
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [anchorElem, editor])

  function onDragStart(event: ReactDragEvent<HTMLDivElement>): void {
    console.log(166)
    const dataTransfer = event.dataTransfer
    if (!dataTransfer || !draggableBlockElem) {
      return
    }
    setDragImage(dataTransfer, draggableBlockElem)
    let nodeKey = ''
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlockElem)
      if (node) {
        nodeKey = node.getKey()
      }
    })
    isDraggingBlockRef.current = true
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey)
  }

  function onDragEnd(): void {
    isDraggingBlockRef.current = false
    hideTargetLine(targetLineRef.current)
  }

  // const height = draggableBlockElem?.clientHeight ?? undefined
  return (
    <Portal containerEl={anchorElem}>
      <div
        className={cn(
          'absolute left-0 top-0 cursor-grab rounded opacity-0 will-change-transform',
          'hover:bg-[#efefef] active:cursor-grabbing',
        )}
        ref={menuRef}
        draggable={true}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <GripVertical
          className={cn(
            'pointer-events-none !h-5 !w-5 opacity-30',
            !isEditable && 'hidden',
          )}
        />
      </div>
      <div
        className="pointer-events-none absolute left-0 top-0 h-0.5 bg-[deepskyblue] opacity-0 will-change-transform"
        ref={targetLineRef}
      />
    </Portal>
  )
}

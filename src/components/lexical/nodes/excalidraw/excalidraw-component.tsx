import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical'
import { PencilIcon } from 'lucide-react'

import { ExcalidrawImage } from '@/components/lexical/nodes/excalidraw/excalidraw-image.tsx'
import {
  ExcalidrawInitialElements,
  ExcalidrawModal,
} from '@/components/lexical/nodes/excalidraw/excalidraw-modal.tsx'
import { ImageResizer } from '@/components/lexical/nodes/excalidraw/image-resizer.tsx'
import { $isExcalidrawNode } from '@/components/lexical/nodes/excalidraw/index.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { cn } from '@/utils/cn.ts'

const ExcalidrawComponent = ({
  data,
  nodeKey,
}: {
  data: string
  nodeKey: NodeKey
}) => {
  const [editor] = useLexicalComposerContext()
  const { open, exit } = useOverlay()
  const imageContainerRef = useRef<HTMLImageElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey)
  const [isResizing, setIsResizing] = useState<boolean>(false)

  const {
    elements = [],
    files = {},
    appState = {},
  } = useMemo(() => JSON.parse(data), [data])

  const deleteNode = useCallback(() => {
    exit()
    return editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isExcalidrawNode(node)) {
        node.remove()
      }
    })
  }, [editor, exit, nodeKey])

  const setData = useCallback(
    (
      els: ExcalidrawInitialElements,
      aps: Partial<AppState>,
      fls: BinaryFiles,
    ) => {
      if (!editor.isEditable()) {
        return
      }
      return editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isExcalidrawNode(node)) {
          if ((els && els.length > 0) || Object.keys(fls).length > 0) {
            node.setData(
              JSON.stringify({
                appState: aps,
                elements: els,
                files: fls,
              }),
            )
          } else {
            node.remove()
          }
        }
      })
    },
    [editor, nodeKey],
  )

  const openModal = useCallback(() => {
    const handleExit = () => {
      editor.setEditable(true)
      exit()
    }
    editor.setEditable(false)
    open(({ isOpen }) => {
      return (
        <ExcalidrawModal
          isOpen={isOpen}
          initialElements={elements}
          initialFiles={files}
          initialAppState={appState}
          onDelete={deleteNode}
          onClose={handleExit}
          onSave={(els, aps, fls) => {
            editor.setEditable(true)
            setData(els, aps, fls)
            handleExit()
          }}
        />
      )
    })
  }, [appState, deleteNode, editor, elements, exit, files, open, setData])

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault()
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isExcalidrawNode(node)) {
            node.remove()
            return true
          }
        })
      }
      return false
    },
    [editor, isSelected, nodeKey],
  )

  // Set editor to readOnly if excalidraw is open to prevent unwanted changes
  // useEffect(() => {
  //   if (isModalOpen) {
  //     editor.setEditable(false)
  //   } else {
  //     editor.setEditable(true)
  //   }
  // }, [isModalOpen, editor])

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const buttonElem = buttonRef.current
          const eventTarget = event.target

          if (isResizing) {
            return true
          }

          if (buttonElem !== null && buttonElem.contains(eventTarget as Node)) {
            if (!event.shiftKey) {
              clearSelection()
            }
            setSelected(!isSelected)
            if (event.detail > 1) {
              openModal()
            }
            return true
          }

          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [
    openModal,
    clearSelection,
    editor,
    isSelected,
    isResizing,
    onDelete,
    setSelected,
  ])

  useEffect(() => {
    if (data === '[]') {
      openModal()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onResizeStart = () => {
    setIsResizing(true)
  }

  const onResizeEnd = (
    nextWidth: 'inherit' | number,
    nextHeight: 'inherit' | number,
  ) => {
    // Delay hiding the resize bars for click case
    setTimeout(() => {
      setIsResizing(false)
    }, 200)

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)

      if ($isExcalidrawNode(node)) {
        node.setWidth(nextWidth)
        node.setHeight(nextHeight)
      }
    })
  }

  console.log(218, isSelected)
  return (
    <>
      {elements.length > 0 && (
        <button
          ref={buttonRef}
          className={cn(
            'relative p-0 bg-transparent',
            isSelected &&
              'select-none outline-none border border-gray-200 border-dashed',
            !isSelected && 'border-0',
          )}
        >
          <ExcalidrawImage
            imageContainerRef={imageContainerRef}
            className="image"
            elements={elements}
            files={files}
            appState={appState}
          />
          {isSelected && (
            <Button
              asChild
              variant={'outline'}
              size={'icon'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={openModal}
              className={'absolute top-4 right-4'}
            >
              <div className={'p-4'}>
                <PencilIcon className={'!w-6 !h-6 shrink-0'} />
              </div>
            </Button>
          )}
          {(isSelected || isResizing) && (
            <ImageResizer
              imageRef={imageContainerRef}
              editor={editor}
              onResizeStart={onResizeStart}
              onResizeEnd={onResizeEnd}
            />
          )}
        </button>
      )}
    </>
  )
}

export default ExcalidrawComponent

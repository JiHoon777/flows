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

import { ImageResizer } from '@/components/lexical/components/image-resizer.tsx'
import { ExcalidrawImage } from '@/components/lexical/nodes/excalidraw/excalidraw-image.tsx'
import {
  ExcalidrawInitialElements,
  ExcalidrawModal,
} from '@/components/lexical/nodes/excalidraw/excalidraw-modal.tsx'
import { $isExcalidrawNode } from '@/components/lexical/nodes/excalidraw/index.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'

const ExcalidrawComponent = ({
  data,
  nodeKey,
}: {
  data: string
  nodeKey: NodeKey
}) => {
  console.log(34444)
  const [editor] = useLexicalComposerContext()
  const { open, exit } = useOverlay()
  const imageContainerRef = useRef<HTMLImageElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const captionButtonRef = useRef<HTMLButtonElement | null>(null)
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
    open(({ exit }) => (
      <ExcalidrawModal
        initialElements={elements}
        initialFiles={files}
        initialAppState={appState}
        onDelete={deleteNode}
        onClose={() => exit()}
        onSave={(els, aps, fls) => {
          editor.setEditable(true)
          setData(els, aps, fls)
          exit()
        }}
        closeOnClickOutside={false}
      />
    ))
  }, [appState, deleteNode, editor, elements, files, open, setData])

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

  // console.log('hi')
  useEffect(() => {
    if (data === '[]' && editor.isEditable()) {
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

  return (
    <>
      {elements.length > 0 && (
        <button
          ref={buttonRef}
          className={`excalidraw-button ${isSelected ? 'selected' : ''}`}
        >
          <ExcalidrawImage
            imageContainerRef={imageContainerRef}
            className="image"
            elements={elements}
            files={files}
            appState={appState}
          />
          {isSelected && (
            <div
              className="image-edit-button"
              role="button"
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openModal}
            />
          )}
          {(isSelected || isResizing) && (
            <ImageResizer
              buttonRef={captionButtonRef}
              showCaption={true}
              setShowCaption={() => null}
              imageRef={imageContainerRef}
              editor={editor}
              onResizeStart={onResizeStart}
              onResizeEnd={onResizeEnd}
              captionsEnabled={true}
            />
          )}
        </button>
      )}
    </>
  )
}

export default ExcalidrawComponent

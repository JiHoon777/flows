import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types/types'

import { Excalidraw } from '@excalidraw/excalidraw'
import { useLayoutEffect, useRef, useState } from 'react'

import { ExcalidrawDiscardModal } from '@/components/lexical/nodes/excalidraw/excalidraw-discard-modal.tsx'
import { Portal } from '@/components/portal.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { useCallbackRefState } from '@/hooks/use-callback-ref-state.ts'
import { useFocusOnMount } from '@/hooks/use-focus-on-mount.ts'
import { cn } from '@/utils/cn.ts'

export type ExcalidrawInitialElements = ExcalidrawInitialDataState['elements']

type Props = {
  isOpen: boolean
  /**
   * The initial set of elements to draw into the scene
   */
  initialElements: ExcalidrawInitialElements
  /**
   * The initial set of elements to draw into the scene
   */
  initialAppState: AppState
  /**
   * The initial set of elements to draw into the scene
   */
  initialFiles: BinaryFiles
  /**
   * Callback when closing and discarding the new changes
   */
  onClose: () => void
  /**
   * Completely remove Excalidraw component
   */
  onDelete: () => void
  /**
   * Callback when the save button is clicked
   */
  onSave: (
    elements: ExcalidrawInitialElements,
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => void
}

export const ExcalidrawModal = ({
  isOpen,
  onSave,
  initialFiles,
  initialElements,
  initialAppState,
  onDelete,
  onClose,
}: Props) => {
  const excalidrawModalRef = useRef<HTMLDivElement | null>(null)
  const [excalidrawAPI, excalidrawAPIRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>()
  const { open: openDiscardModal } = useOverlay()
  const [elements, setElements] =
    useState<ExcalidrawInitialElements>(initialElements)
  const [files, setFiles] = useState<BinaryFiles>(initialFiles)

  useFocusOnMount(excalidrawModalRef)

  useLayoutEffect(() => {
    const currentModalRef = excalidrawModalRef.current

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDelete()
      }
    }

    if (currentModalRef !== null) {
      currentModalRef.addEventListener('keydown', onKeyDown)
    }

    return () => {
      if (currentModalRef !== null) {
        currentModalRef.removeEventListener('keydown', onKeyDown)
      }
    }
  }, [elements, files, onDelete])

  const save = () => {
    if (elements && elements.filter((el) => !el.isDeleted).length > 0) {
      const appState = excalidrawAPI?.getAppState()
      // We only need a subset of the state
      const partialState: Partial<AppState> = {
        exportBackground: appState?.exportBackground,
        exportScale: appState?.exportScale,
        exportWithDarkMode: appState?.theme === 'dark',
        isBindingEnabled: appState?.isBindingEnabled,
        isLoading: appState?.isLoading,
        name: appState?.name,
        theme: appState?.theme,
        viewBackgroundColor: appState?.viewBackgroundColor,
        viewModeEnabled: appState?.viewModeEnabled,
        zenModeEnabled: appState?.zenModeEnabled,
        zoom: appState?.zoom,
      }
      onSave(elements, partialState, files)
    } else {
      // delete node if the scene is clear
      onDelete()
    }
  }

  const discard = () => {
    if (elements && elements.filter((el) => !el.isDeleted).length === 0) {
      // delete node if the scene is clear
      onDelete()
    } else {
      //Otherwise, show confirmation dialog before closing
      openDiscardModal(({ isOpen, exit }) => (
        <ExcalidrawDiscardModal
          isOpen={isOpen}
          onClose={exit}
          discard={() => {
            exit()
            onClose()
          }}
        />
      ))
    }
  }

  const onChange = (
    els: ExcalidrawInitialElements,
    _: AppState,
    fls: BinaryFiles,
  ) => {
    setElements(els)
    setFiles(fls)
  }

  if (!isOpen) {
    return null
  }

  /**
   * ModalOverlay 컴포넌트를 쓰면 Excalidraw 의 width, height 가 잡히지 않는다.
   **/
  return (
    <Portal>
      <div
        className={
          'fixed inset-0 z-50 flex items-center justify-center bg-black/80'
        }
      >
        <div
          ref={excalidrawModalRef}
          className={
            'relative z-10 w-auto rounded-lg bg-background pt-4 shadow-accent'
          }
        >
          <div className={cn('relative h-[70vh] w-[70vw]')}>
            <Excalidraw
              onChange={onChange}
              excalidrawAPI={excalidrawAPIRefCallback}
              initialData={{
                appState: initialAppState || { isLoading: false },
                elements: initialElements,
                files: initialFiles,
              }}
            />
          </div>
          <div className={'flex items-center justify-end gap-4 p-4'}>
            <Button variant={'destructive'} onClick={discard}>
              Discard
            </Button>
            <Button variant={'default'} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

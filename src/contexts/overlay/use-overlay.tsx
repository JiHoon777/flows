import type { OverlayControlRef } from './overlay-controller'
import type { CreateOverlayElement } from './types'

import { useContext, useEffect, useMemo, useRef, useState } from 'react'

import { OverlayController } from './overlay-controller'
import { OverlayContext } from './overlay-provider'

let elementId = 1

interface Options {
  exitOnUnmount?: boolean
}

export function useOverlay({ exitOnUnmount = true }: Options = {}) {
  const context = useContext(OverlayContext)

  if (context == null) {
    throw new Error('useOverlay is only available within OverlayProvider.')
  }

  const { mount, unmount } = context
  const [id] = useState(() => String(elementId++))

  const overlayRef = useRef<OverlayControlRef | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (exitOnUnmount) {
        unmount(id)
      }
    }
  }, [exitOnUnmount, id, unmount])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useMemo(
    () => ({
      close: () => {
        overlayRef.current?.close()
      },
      exit: () => {
        overlayRef.current?.close()

        timeoutRef.current = setTimeout(() => {
          unmount(id)
        }, 500)
      },
      open: (overlayElement: CreateOverlayElement) => {
        mount(
          id,
          <OverlayController
            // NOTE: state should be reset every time we open an overlay
            key={Date.now()}
            ref={overlayRef}
            overlayElement={overlayElement}
            onExit={() => {
              overlayRef.current?.close()

              timeoutRef.current = setTimeout(() => {
                unmount(id)
              }, 500)
            }}
          />,
        )
      },
    }),
    [id, mount, unmount],
  )
}

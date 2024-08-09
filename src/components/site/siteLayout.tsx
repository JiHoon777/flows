import { AnimatePresence, motion } from 'framer-motion'
import { debounce } from 'lodash-es'
import { memo, useCallback, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Providers } from '@/components/providers.tsx'
import { Explorer } from '@/components/site/explorer/explorer.tsx'
import { SiteHeader } from '@/components/site/siteHeader.tsx'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable.tsx'
import { cn } from '@/utils/cn.ts'

export const SiteLayout = memo(() => {
  const [panelSize, setPanelSize] = useState(15)
  const [isResizing, setIsResizing] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSetIsResizing = useCallback(
    debounce((value) => setIsResizing(value), 100),
    [],
  )

  const handleResize = useCallback(
    (size: number) => {
      setIsResizing(true)
      setPanelSize(size)
      debouncedSetIsResizing(false)
    },
    [debouncedSetIsResizing],
  )

  const tempPanelSize = useRef(0)
  const showExplorer = panelSize > 0
  const toggleShowExplorer = useCallback(() => {
    if (showExplorer) {
      tempPanelSize.current = panelSize
      setPanelSize(0)
    } else {
      setPanelSize(tempPanelSize.current)
    }
  }, [panelSize, showExplorer])

  return (
    <Providers>
      <div
        className={
          'flex h-screen w-screen flex-col overflow-hidden bg-background'
        }
      >
        <SiteHeader
          showExplorer={showExplorer}
          toggleShowExplorer={toggleShowExplorer}
        />

        <ResizablePanelGroup
          direction={'horizontal'}
          className={'h-screen w-full'}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key="explorer"
              initial={{ width: 0 }}
              animate={{ width: `${panelSize}%` }}
              exit={{ width: 0 }}
              transition={{ duration: isResizing ? 0 : 0.1, ease: 'easeInOut' }}
            >
              <ResizablePanel
                className={cn('h-full', !showExplorer && 'hidden')}
                minSize={10}
                maxSize={30}
                defaultSize={panelSize}
                onResize={handleResize}
              >
                <Explorer />
              </ResizablePanel>
            </motion.div>
          </AnimatePresence>
          <ResizableHandle />
          <ResizablePanel className={'h-full'} minSize={30}>
            <Outlet />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Providers>
  )
})

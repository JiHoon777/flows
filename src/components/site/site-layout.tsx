import { Outlet } from 'react-router-dom'

import { Providers } from '@/components/providers.tsx'
import { Explorer } from '@/components/site/explorer/explorer.tsx'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable.tsx'

export const SiteLayout = () => {
  return (
    <Providers>
      <div className={'flex h-screen w-screen overflow-hidden bg-background'}>
        <ResizablePanelGroup
          direction={'horizontal'}
          className={'h-screen w-full'}
        >
          <ResizablePanel
            className={'h-full'}
            minSize={10}
            maxSize={30}
            defaultSize={15}
          >
            <Explorer />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel className={'h-full'} minSize={30}>
            <Outlet />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Providers>
  )
}

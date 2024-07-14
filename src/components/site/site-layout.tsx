import { Outlet } from 'react-router-dom'

import { Providers } from '@/components/providers.tsx'
import { Explorer } from '@/components/site/explorer/explorer.tsx'
import { SiteDataLoader } from '@/components/site/site-data-loader.tsx'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable.tsx'

export const SiteLayout = () => {
  return (
    <Providers>
      <div className={'flex w-screen h-screen overflow-hidden bg-background'}>
        <ResizablePanelGroup
          direction={'horizontal'}
          className={'w-full h-screen'}
        >
          <ResizablePanel className={'h-full'} minSize={1} defaultSize={15}>
            <Explorer />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel className={'h-full'} minSize={30}>
            <Outlet />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <SiteDataLoader />
    </Providers>
  )
}

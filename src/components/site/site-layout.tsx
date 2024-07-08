import { Outlet } from 'react-router-dom'

import { Providers } from '@/components/providers.tsx'
import { SiteDataLoader } from '@/components/site/site-data-loader.tsx'
import { SiteLeftExplorer } from '@/components/site/site-left-explorer.tsx'
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
          <ResizablePanel className={'h-full'} minSize={0} defaultSize={15}>
            <SiteLeftExplorer />
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

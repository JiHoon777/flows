import { observer } from 'mobx-react'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RegisterGlobalHotkeys } from '@/components/hotkey/RegisterGlobalHotkeys.tsx'
import { BookLoading } from '@/components/loading/book-loading.tsx'

const SiteLayout = lazy(() =>
  import('@/components/site/site-layout.tsx').then((module) => ({
    default: module.SiteLayout,
  })),
)
const FlowDetailView = lazy(() =>
  import('@/views/flow-detail-view.tsx').then((module) => ({
    default: module.FlowDetailViewParamsWrap,
  })),
)
const NodeDetailView = lazy(() =>
  import('@/views/node-detail-view.tsx').then((module) => ({
    default: module.NodeDetailViewParamsWrap,
  })),
)

export const AppRoutes = observer(() => {
  return (
    <>
      <RegisterGlobalHotkeys />
      <Suspense fallback={<BookLoading />}>
        <Routes>
          <Route path={'/'} element={<SiteLayout />}>
            <Route index element={null} />
            <Route path={'flows/:flowId'} element={<FlowDetailView />} />
            <Route path={'nodes/:nodeId'} element={<NodeDetailView />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
})

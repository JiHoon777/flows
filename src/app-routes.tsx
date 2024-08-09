import type { ComponentType } from 'react'

import { observer } from 'mobx-react'
import { lazy as _lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RegisterGlobalHotkeys } from '@/components/hotkey/RegisterGlobalHotkeys.tsx'
import { SiteLayout } from '@/components/site/siteLayout.tsx'

type LazyComponentModule = { [key: string]: ComponentType<any> }

function lazy<T extends LazyComponentModule, K extends keyof T>(
  importFunc: () => Promise<T>,
  componentName: K,
) {
  return _lazy(() =>
    importFunc().then((module) => ({
      default: module[componentName],
    })),
  )
}

const FlowDetailView = lazy(
  () => import('@/views/flow-detail-view'),
  'FlowDetailViewParamsWrap',
)
const NodeDetailView = lazy(
  () => import('@/views/node-detail-view'),
  'NodeDetailViewParamsWrap',
)
const HomeView = lazy(() => import('@/views/homeView'), 'HomeView')
const FlowsView = lazy(() => import('@/views/flowsView'), 'FlowsView')
const DocumentsView = lazy(
  () => import('@/views/documentsView'),
  'DocumentsView',
)
const CalendarView = lazy(() => import('@/views/calendarView'), 'CalendarView')
const BookmarkView = lazy(
  () => import('@/views/bookmarksView.tsx'),
  'BookmarksView',
)
const InboxView = lazy(() => import('@/views/inboxView'), 'InboxView')

export const AppRoutes = observer(() => {
  const Layout = <SiteLayout />
  return (
    <>
      <RegisterGlobalHotkeys />
      <Suspense fallback={Layout}>
        <Routes>
          <Route path={'/'} element={Layout}>
            <Route index element={null} />
            <Route path={'home'} element={<HomeView />} />
            <Route path={'flows'} element={<FlowsView />} />
            <Route path={'documents'} element={<DocumentsView />} />
            <Route path={'calendar'} element={<CalendarView />} />
            <Route path={'bookmarks'} element={<BookmarkView />} />
            <Route path={'inbox'} element={<InboxView />} />
            <Route path={'flows/:flowId'} element={<FlowDetailView />} />
            <Route path={'nodes/:nodeId'} element={<NodeDetailView />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
})

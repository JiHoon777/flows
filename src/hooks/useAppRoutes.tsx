import type { ComponentType } from 'react'

import { lazy as _lazy } from 'react'
import { useRoutes } from 'react-router-dom'

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

const appLazyLoad = {
  BookmarkView: lazy(
    () => import('@/views/bookmarksView.tsx'),
    'BookmarksView',
  ),
  CalendarView: lazy(() => import('@/views/calendarView'), 'CalendarView'),
  DocumentsView: lazy(() => import('@/views/documentsView'), 'DocumentsView'),
  FlowDetailView: lazy(
    () => import('@/views/flow-detail-view'),
    'FlowDetailViewParamsWrap',
  ),
  FlowsView: lazy(() => import('@/views/flowsView'), 'FlowsView'),
  HomeView: lazy(() => import('@/views/homeView'), 'HomeView'),
  InboxView: lazy(() => import('@/views/inboxView'), 'InboxView'),
  NodeDetailView: lazy(
    () => import('@/views/node-detail-view'),
    'NodeDetailViewParamsWrap',
  ),
}

export const useAppRoutes = () => {
  return useRoutes([
    {
      children: [
        { element: null, index: true },
        { element: <appLazyLoad.HomeView />, path: 'home' },
        { element: <appLazyLoad.FlowsView />, path: 'flows' },
        { element: <appLazyLoad.DocumentsView />, path: 'documents' },
        { element: <appLazyLoad.CalendarView />, path: 'calendar' },
        { element: <appLazyLoad.BookmarkView />, path: 'bookmarks' },
        { element: <appLazyLoad.InboxView />, path: 'inbox' },
        { element: <appLazyLoad.FlowDetailView />, path: 'flows/:flowId' },
        { element: <appLazyLoad.NodeDetailView />, path: 'nodes/:nodeId' },
      ],
      element: <SiteLayout />,
      path: '/',
    },
  ])
}

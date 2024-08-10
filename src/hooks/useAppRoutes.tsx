import type { ComponentType } from 'react'

import { lazy as _lazy, Suspense } from 'react'
import { useRoutes } from 'react-router-dom'

import { SiteLayout } from '@/components/site/siteLayout.tsx'

type LazyComponentModule = { [key: string]: ComponentType<any> }

function lazy<T extends LazyComponentModule, K extends keyof T>(
  importFunc: () => Promise<T>,
  componentName?: K,
) {
  return _lazy(() =>
    importFunc().then((module) => {
      if (componentName) {
        return { default: module[componentName] }
      }
      // If no componentName is provided, return the first export
      const firstExport = Object.values(module)[0]
      if (!firstExport) {
        throw new Error('No exports found in the module')
      }
      return { default: firstExport }
    }),
  )
}

const appLazyLoad = {
  BookmarkView: lazy(() => import('@/views/bookmarksView.tsx')),
  CalendarView: lazy(() => import('@/views/calendarView')),
  DocumentsView: lazy(() => import('@/views/documentsView')),
  FlowDetailView: lazy(() => import('@/views/flow-detail-view')),
  FlowsView: lazy(() => import('@/views/flowsView')),
  HomeView: lazy(() => import('@/views/homeView')),
  InboxView: lazy(() => import('@/views/inboxView')),
  NodeDetailView: lazy(
    () => import('@/views/node-detail-view'),
    'NodeDetailViewParamsWrap',
  ),
}

const appPathnamesForRouter = {
  bookmarks: 'bookmarks',
  calendar: 'calendar',
  documents: 'documents',
  flows: 'flows',
  flowsDetail: (...args: string[]) => `flows/${args[0]}`,
  home: 'home',
  inbox: 'inbox',
  nodesDetail: (...args: string[]) => `nodes/${args[0]}`,
}

export const appPathnames = Object.entries(appPathnamesForRouter).reduce(
  (acc, [key, value]) => {
    if (typeof value === 'function') {
      acc[key] = (...args: string[]) => `/${value(...args)}`
    } else {
      acc[key] = `/${value}`
    }
    return acc
  },
  {} as Record<string, string | ((...args: string[]) => string)>,
) as typeof appPathnamesForRouter

export const useAppRoutes = () => {
  const routes = useRoutes([
    {
      children: [
        { element: null, index: true },
        { element: <appLazyLoad.HomeView />, path: appPathnamesForRouter.home },
        {
          element: <appLazyLoad.FlowsView />,
          path: appPathnamesForRouter.flows,
        },
        {
          element: <appLazyLoad.DocumentsView />,
          path: appPathnamesForRouter.documents,
        },
        {
          element: <appLazyLoad.CalendarView />,
          path: appPathnamesForRouter.calendar,
        },
        {
          element: <appLazyLoad.BookmarkView />,
          path: appPathnamesForRouter.bookmarks,
        },
        {
          element: <appLazyLoad.InboxView />,
          path: appPathnamesForRouter.inbox,
        },
        {
          element: <appLazyLoad.FlowDetailView />,
          path: appPathnamesForRouter.flowsDetail(':flowId'),
        },
        {
          element: <appLazyLoad.NodeDetailView />,
          path: appPathnamesForRouter.nodesDetail(':nodeId'),
        },
      ],
      path: '/',
    },
  ])
  return (
    <SiteLayout>
      <Suspense fallback={null}>{routes}</Suspense>
    </SiteLayout>
  )
}

// Todo: AdminRoutes, IntroductionAndDownloadRoutes

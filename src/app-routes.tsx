import { observer } from 'mobx-react'
import { Suspense } from 'react'

import { RegisterGlobalHotkeys } from '@/components/hotkey/RegisterGlobalHotkeys.tsx'
import { SiteLayout } from '@/components/site/siteLayout.tsx'
import { useAppRoutes } from '@/hooks/useAppRoutes.tsx'

export const AppRoutes = observer(() => {
  const appRoutes = useAppRoutes()

  return (
    <>
      <RegisterGlobalHotkeys />
      <Suspense fallback={<SiteLayout />}>{appRoutes}</Suspense>
    </>
  )
})

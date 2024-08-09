import { observer } from 'mobx-react'

import { RegisterGlobalHotkeys } from '@/components/hotkey/RegisterGlobalHotkeys.tsx'
import { useAppRoutes } from '@/hooks/useAppRoutes.tsx'

export const AppRoutes = observer(() => {
  const appRoutes = useAppRoutes()

  return (
    <>
      <RegisterGlobalHotkeys />

      {appRoutes}
    </>
  )
})

import { observer } from 'mobx-react'

import { AppRoutes } from '@/app-routes.tsx'
import { BookLoading } from '@/components/loading/book-loading.tsx'
import { AppDataLoader } from '@/components/site/app-data-loader.tsx'
import { useStore } from '@/store/useStore.ts'

// Todo: App Data 받아오는동안 풀로딩 화면 이쁜걸루
export const App = observer(() => {
  const store = useStore()

  return (
    <>
      {store.appLoaded ? <AppRoutes /> : <BookLoading />}
      <AppDataLoader />
    </>
  )
})

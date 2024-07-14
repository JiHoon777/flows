import { observer } from 'mobx-react'

import { ExplorerToolbar } from '@/components/site/explorer/explorer-toolbar.tsx'
import { SiteLeftExplorerFlowRow } from '@/components/site/site-left-explorer-flow-row'
import { useStore } from '@/store/useStore.ts'

export const SiteLeftExplorer = observer(() => {
  const store = useStore()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'w-full flex flex-col gap-2 p-4 '}>
      <ExplorerToolbar />
      <section className={'w-full flex flex-col gap-1.5'}>
        {explorerList.map((flow) => (
          <SiteLeftExplorerFlowRow key={flow.id} flow={flow} />
        ))}
      </section>
    </div>
  )
})

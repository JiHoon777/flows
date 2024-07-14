import { observer } from 'mobx-react'

import { ExplorerFlowRow } from '@/components/site/explorer/explorer-flow-row.tsx'
import { ExplorerToolbar } from '@/components/site/explorer/explorer-toolbar.tsx'
import { useStore } from '@/store/useStore.ts'

export const Explorer = observer(() => {
  const store = useStore()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'w-full flex flex-col gap-2 p-4 '}>
      <ExplorerToolbar />
      <section className={'w-full flex flex-col gap-1.5'}>
        {explorerList.map((flow) => (
          <ExplorerFlowRow key={flow.id} flow={flow} />
        ))}
      </section>
    </div>
  )
})

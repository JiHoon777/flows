import { observer } from 'mobx-react'

import { ExplorerFlowRow } from '@/components/site/explorer/explorer-flow-row.tsx'
import { ExplorerNodeRow } from '@/components/site/explorer/explorer-node-row.tsx'
import { ExplorerToolbar } from '@/components/site/explorer/explorer-toolbar.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

export const Explorer = observer(() => {
  const store = useStore()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'flex w-full flex-col gap-2 p-4'}>
      <ExplorerToolbar />
      <section className={'flex w-full flex-col gap-1.5'}>
        {explorerList.map((flow) =>
          flow instanceof DoFlow ? (
            <ExplorerFlowRow key={flow.id} flow={flow} />
          ) : (
            <ExplorerNodeRow key={flow.id} node={flow} />
          ),
        )}
      </section>
    </div>
  )
})

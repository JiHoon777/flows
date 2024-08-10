import { observer } from 'mobx-react'

import { ExplorerFlowRow } from '@/components/site/explorer/explorer-flow-row.tsx'
import { ExplorerNodeRow } from '@/components/site/explorer/explorer-node-row.tsx'
import { ExplorerMainNavigation } from '@/components/site/explorer/explorerMainNavigation.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

export const Explorer = observer(() => {
  const store = useStore()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'flex w-full flex-col gap-4 px-2 pt-4'}>
      <ExplorerMainNavigation />
      <section className={'flex w-full flex-col gap-1.5'}>
        <div className={'pl-2 text-sm'}>플로우</div>
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

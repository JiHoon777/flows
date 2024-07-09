import { observer } from 'mobx-react'

import { SiteLeftExplorerFlowRow } from '@/components/site/site-left-explorer-flow-row'
import { useStore } from '@/store/useStore.ts'

export const SiteLeftExplorer = observer(() => {
  const store = useStore()

  const explorerList = Object.values(store.flowStore.flowsMap).filter(
    (flow) => !flow.parentFlowId,
  )

  return (
    <section className={'w-full flex flex-col pt-10 p-4 gap-1.5'}>
      {explorerList.map((flow) => (
        <SiteLeftExplorerFlowRow key={flow.id} flow={flow} />
      ))}
    </section>
  )
})

import { SiteLeftExplorerFlowRow } from '@/components/site/site-left-explorer-flow-row'
import { useStore } from '@/store/store'

export const SiteLeftExplorer = () => {
  const explorerList = useStore((state) =>
    [...state.flowsMap.values()].filter((flow) => !flow.parentFlowId),
  )

  return (
    <section className={'w-full flex flex-col pt-10 p-4 gap-1.5'}>
      {explorerList.map((flow) => (
        <SiteLeftExplorerFlowRow key={flow.flowId} flow={flow} />
      ))}
    </section>
  )
}

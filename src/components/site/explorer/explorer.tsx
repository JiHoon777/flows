import { observer } from 'mobx-react'

import { ExplorerFlowRow } from '@/components/site/explorer/explorer-flow-row.tsx'
import { ExplorerNodeRow } from '@/components/site/explorer/explorer-node-row.tsx'
import { ExplorerMainNavigation } from '@/components/site/explorer/explorerMainNavigation.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { Plus, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

export const Explorer = observer(() => {
  const store = useStore()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'flex w-full flex-col gap-4 px-2 pt-4'}>
      <ExplorerMainNavigation />
      <section className={'flex w-full flex-col gap-1.5'}>
        <div className={'flex items-center justify-between pl-2 text-sm'}>
          <span>플로우</span>
          <Button
            size={'xs'}
            variant={'ghost'}
            onClick={() => store.explorerView.createFlowOnRoot()}
          >
            <PlusCircle
              className={'h-[18px] w-[18px] text-gray-500 hover:text-gray-900'}
            />
          </Button>
        </div>
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

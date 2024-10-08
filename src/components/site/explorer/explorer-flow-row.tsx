import { AnimatePresence, motion } from 'framer-motion'
import { observer } from 'mobx-react'
import { useEffect, useRef, useState } from 'react'

import { ExplorerFlowRowItem } from '@/components/site/explorer/explorer-flow-row-item.tsx'
import { ExplorerNodeRow } from '@/components/site/explorer/explorer-node-row.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { ExplorerViewModel } from '@/store/views/explorerViewModel.ts'

export const ExplorerFlowRow = observer(({ flow }: { flow: DoFlow }) => {
  const store = useStore()
  const explorerView = store.explorerView

  const [isOpen, setIsOpen] = useState(false)
  const isMountedRef = useRef(false)

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }

    if (explorerView.isExpandAll) {
      setIsOpen(true)
      return
    }

    setIsOpen(false)
  }, [explorerView.isExpandAll])

  const childFlows = ExplorerViewModel.convertChildFlowIdsToDoFlows(
    flow.id,
    (id) => store.flowStore.getFlowById(id),
  )
  const childNodes = ExplorerViewModel.convertChildNodeIdsToDoNodes(
    flow.id,
    (id) => store.flowStore.getFlowById(id),
    (id) => store.nodeStore.getNodeById(id),
  )
  const sortedFlowAndNodes = ExplorerViewModel.sortFlowsOrNodesBySortOption(
    [...childFlows, ...childNodes],
    store.explorerView.sortOption,
  )

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ExplorerFlowRowItem
        flow={flow}
        isChildOpen={isOpen}
        setIsChildOpen={setIsOpen}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={'ml-3.5 border-l pl-0.5'}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {sortedFlowAndNodes.map((item) => {
              if (item instanceof DoFlow) {
                return <ExplorerFlowRow key={item.id} flow={item} />
              }
              return <ExplorerNodeRow key={item.id} node={item} />
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

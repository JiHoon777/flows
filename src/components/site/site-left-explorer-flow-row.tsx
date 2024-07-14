import { useEffect, useRef, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { SiteLeftExplorerNodeRow } from '@/components/site/site-left-explorer-node-row'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { ExplorerView } from '@/store/views/explorer-view.ts'
import { cn } from '@/utils/cn'

export const SiteLeftExplorerFlowRow = observer(
  ({ flow }: { flow: DoFlow }) => {
    const navigate = useNavigate()
    const { flowId } = useParams<{ flowId?: string }>()
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

    const FlowIdsToFlows =
      flow?.childFlowIds
        ?.map((id) => store.flowStore.getFlowById(id))
        .filter((cf) => !!cf) ?? []
    const NodeIdsToNodes =
      flow.childNodeIds
        ?.map((id) => store.nodeStore.getNodeById(id))
        .filter((cn) => !!cn && cn.type === 'note') ?? []
    const sortedFlowAndNodes = ExplorerView.sortFlowsOrNodesBySortOption(
      [...FlowIdsToFlows, ...NodeIdsToNodes],
      store.explorerView.sortOption,
    )

    const isViewing = flow.id === flowId
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={cn(
            'site-left-explorer-row',
            isViewing && 'site-left-explorer-selected-row',
          )}
          onClick={() => navigate(`/flows/${flow.id}`)}
        >
          <motion.div
            initial={false}
            animate={{ rotate: !isOpen ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight
              className={'w-4 h-4 text-gray-500'}
              onClick={() => setIsOpen((p) => !p)}
            />
          </motion.div>
          <span className={'text-sm'}>
            {flow.title ?? '-'} {isViewing && '👀'}
          </span>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={'border-l ml-3.5 pl-0.5'}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sortedFlowAndNodes.map((item) => {
                if (item instanceof DoFlow) {
                  return <SiteLeftExplorerFlowRow key={item.id} flow={item} />
                }
                return <SiteLeftExplorerNodeRow key={item.id} node={item} />
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  },
)

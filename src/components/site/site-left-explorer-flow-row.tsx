import { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { SiteLeftExplorerNodeRow } from '@/components/site/site-left-explorer-node-row'
import { Badge } from '@/components/ui/badge'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn'

export const SiteLeftExplorerFlowRow = observer(
  ({ flow }: { flow: DoFlow }) => {
    const store = useStore()
    const navigate = useNavigate()
    const { flowId } = useParams<{ flowId?: string }>()

    const [isOpen, setIsOpen] = useState(false)

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
          <span className={'text-sm'}>{flow.title ?? '-'}</span>
          <Badge variant={'outline'} className={'py-0.5 px-2 ml-auto'}>
            flow
          </Badge>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={'border-l ml-3.5'}
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {flow.childFlowIds?.map((cf) => {
                const found = store.flowStore.getFlowById(cf)
                return found ? (
                  <SiteLeftExplorerFlowRow key={found.id} flow={found} />
                ) : null
              })}
              {flow.childNodeIds?.map((cn) => {
                const found = store.nodeStore.getNodeById(cn)
                return found?.type === 'note' ? (
                  <SiteLeftExplorerNodeRow key={found.id} node={found} />
                ) : null
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  },
)

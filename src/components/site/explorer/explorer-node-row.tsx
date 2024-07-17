import { Effect } from 'effect'
import { motion } from 'framer-motion'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { AlertModal } from '@/components/alert-modal.tsx'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { DoNode } from '@/store/node/do-node.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

export const ExplorerNodeRow = observer(({ node }: { node: DoNode }) => {
  const navigate = useNavigate()
  const store = useStore()
  const { nodeId } = useParams<{ nodeId?: string }>()
  const { open } = useOverlay()

  const openDelete = () => {
    open(({ isOpen, exit }) => (
      <AlertModal
        isOpen={isOpen}
        onClose={exit}
        onFinish={() => Effect.runPromise(store.nodeStore.removeNode(node.id))}
      />
    ))
  }

  const isViewing = node.id === nodeId
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.05 }}
          className={cn(
            'site-left-explorer-row',
            isViewing && 'site-left-explorer-selected-row',
          )}
          onClick={() => navigate(`/nodes/${node.id}`)}
        >
          <span className={'max-w-full truncate text-sm'}>{node.title}</span>
          {isViewing && <span className={'absolute -right-4'}>👀</span>}
        </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={openDelete}>Delete ...</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

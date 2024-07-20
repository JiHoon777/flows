import { useRef } from 'react'

import { Effect } from 'effect'
import { motion } from 'framer-motion'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { AlertModal } from '@/components/alert-modal.tsx'
import { Menu, MenuModel, MenuRef } from '@/components/menu/menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { DoNode } from '@/store/node/do-node.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

export const ExplorerNodeRow = observer(({ node }: { node: DoNode }) => {
  const navigate = useNavigate()
  const store = useStore()
  const { nodeId } = useParams<{ nodeId?: string }>()
  const { open } = useOverlay()
  const contextMenuRef = useRef<MenuRef | null>(null)

  const openDelete = () => {
    open(({ isOpen, exit }) => (
      <AlertModal
        isOpen={isOpen}
        onClose={exit}
        onFinish={() => Effect.runPromise(store.nodeStore.removeNode(node.id))}
      />
    ))
  }

  const contextMenuModel: MenuModel = [
    {
      label: 'Delete ...',
      command: openDelete,
    },
  ]

  const isViewing = node.id === nodeId
  return (
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
      onContextMenu={(e) => contextMenuRef.current?.show(e)}
    >
      <span className={'max-w-full truncate text-sm'}>{node.title}</span>
      {isViewing && <span className={'absolute -right-4'}>👀</span>}
      <Menu ref={contextMenuRef} model={contextMenuModel} />
    </motion.div>
  )
})

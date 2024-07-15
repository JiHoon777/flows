import { memo } from 'react'

import { NodeProps } from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import { NodeWrap } from '@/components/flow-node/node-wrap'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { NoteNodeData } from '@/store/types'
import { useStore } from '@/store/useStore.ts'

export const NoteNode = memo((props: NodeProps<NoteNodeData>) => {
  const { id } = props
  const store = useStore()
  const { open } = useOverlay()

  const parentFlowId = store.nodeStore.getNodeById(id)?.parentFlowId ?? '-1'
  const drawer = store.flowStore.getFlowById(parentFlowId)?.drawer

  const handleRemove = () => {
    open(({ isOpen, exit }) => (
      <AlertModal
        isOpen={isOpen}
        onClose={exit}
        onFinish={() => drawer?.removeNode(id, 'note')}
      />
    ))
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <NodeWrap {...props}></NodeWrap>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRemove}>Remove</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

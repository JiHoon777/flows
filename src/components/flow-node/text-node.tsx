import { useCallback } from 'react'

import { debounce } from 'lodash-es'
import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import { NodeWrap } from '@/components/flow-node/node-wrap'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { TextNodeData } from '@/store/types'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

export const TextNode = observer((props: NodeProps<TextNodeData>) => {
  const { data, id, type } = props
  const store = useStore()
  const { open } = useOverlay()

  const parentFlowId = store.nodeStore.getNodeById(id)?.parentFlowId ?? '-1'
  const drawer = store.flowStore.getFlowById(parentFlowId)?.drawer

  const handleRemove = () => {
    open(({ isOpen, exit }) => (
      <AlertModal
        isOpen={isOpen}
        onClose={exit}
        onFinish={() => drawer?.removeNode(id, 'text')}
      />
    ))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedChangeHandler = useCallback(
    debounce((v: string) => {
      drawer?.updateNodeTitle({
        id,
        type: 'text',
        title: v,
      })
    }, 500),
    [debounce, drawer],
  )
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <NodeWrap {...props}>
          <Textarea
            className={cn(
              'w-full h-full border-0 py-0.5 px-0.5 rounded',
              'text-sm font-bold bg-transparent text-gray-900 resize-none',
            )}
            defaultValue={data.title}
            onChange={(e) => debouncedChangeHandler(e.target.value)}
          />
        </NodeWrap>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRemove}>Remove</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

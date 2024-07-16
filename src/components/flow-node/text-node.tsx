import { useCallback } from 'react'

import { debounce } from 'lodash-es'
import { observer } from 'mobx-react'
import { NodeProps } from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { NodeWrap } from '@/components/flow-node/node-wrap'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { TextNodeData } from '@/store/types'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

export const TextNode = observer((props: NodeProps<TextNodeData>) => {
  const { data, id, dragging, selected } = props
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
          <div
            className={cn(
              'relative flex flex-col items-center w-full h-full p-2',
              'overflow-x-hidden overflow-y-auto scrollbar-hide',
              selected && 'nowheel',
            )}
          >
            <FlTextareaAutoSize
              className={cn(
                'nodrag shrink-0 p-2 text-4xl w-full resize-none mx-2 mt-2 font-bold border-0 shadow-none',
                (!selected || dragging) && 'pointer-events-none',
                selected && dragging && 'pointer-events-none',
                'overflow-hidden',
              )}
              defaultValue={data.title}
              onChange={(e) => debouncedChangeHandler(e.target.value)}
              draggable
            />
          </div>
        </NodeWrap>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRemove}>Remove</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

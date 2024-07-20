import { PropsWithChildren, useCallback } from 'react'

import { Effect } from 'effect'
import { debounce } from 'lodash-es'
import { observer } from 'mobx-react'
import {
  Handle,
  NodeProps,
  NodeResizer,
  Position,
  ResizeDragEvent,
} from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import { NodeContent } from '@/components/flow-node/node-content.tsx'
import { NodeIcon } from '@/components/flow-node/node-icon.tsx'
import { useGetNodeDrawer } from '@/components/flow-node/useGetNodeDrawer.ts'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { useStore } from '@/store/useStore.ts'
import { NodeType } from '@/types/base.type.ts'
import { cn } from '@/utils/cn'

type Props = PropsWithChildren & NodeProps & { type: NodeType | 'flow' }

export const NodeWrap = observer(
  ({ children, selected, id, type, dragging, data }: Props) => {
    const store = useStore()
    const { open } = useOverlay()

    const drawer = useGetNodeDrawer(id, type)

    const handleResizeEnd = useCallback(
      (
        _: ResizeDragEvent,
        { width, height }: { width: number; height: number },
      ) => {
        if (type === 'flow') {
          Effect.runPromise(
            store.flowStore.updateFlow({
              flowId: id,
              changedFlow: { style: { width, height } },
            }),
          ).catch(store.showError)
          // id, { style: { width, height } }
          return
        }

        Effect.runPromise(
          store.nodeStore.updateNode({
            nodeId: id,
            changedNode: { style: { width, height } },
          }),
        ).catch(store.showError)
      },
      [id, store.flowStore, store.nodeStore, store.showError, type],
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedChangeHandler = useCallback(
      debounce((v: string) => {
        drawer?.updateNodeTitle({
          id,
          type,
          title: v,
        })
      }, 500),
      [debounce, drawer],
    )

    const handleRemove = useCallback(() => {
      open(({ isOpen, exit }) => (
        <AlertModal
          isOpen={isOpen}
          onClose={exit}
          onFinish={() => drawer?.removeNode(id, type)}
        />
      ))
    }, [drawer, id, open, type])

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <section
            className={cn(
              'w-full h-full flex z-[1] relative !bg-background rounded p-3',
            )}
          >
            <NodeIcon type={type} />
            <NodeResizer
              isVisible
              minWidth={150}
              minHeight={100}
              lineClassName={'!border-transparent !border-[10px]'}
              handleClassName={'!border-transparent !bg-transparent'}
              onResizeEnd={handleResizeEnd}
            />

            <NodeContent
              selected={selected}
              dragging={dragging}
              title={data.title}
              onTitleChange={debouncedChangeHandler}
            >
              {children}
            </NodeContent>

            <Handle
              type="target"
              position={Position.Top}
              className={'!top-[50%] !pointer-events-none !opacity-0'}
            />
            <Handle
              type="source"
              position={Position.Top}
              className={cn(
                '!left-0 !top-0 !transform-none !bg-transparent',
                '!h-full !w-full !rounded !border-2 !border-border',
                selected && '!border-primary',
              )}
            />
          </section>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleRemove}>Remove</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
)

import { PropsWithChildren, useCallback } from 'react'

import { Effect } from 'effect'
import { debounce } from 'lodash-es'
import { Map, NotebookPen, Type } from 'lucide-react'
import { observer } from 'mobx-react'
import {
  Handle,
  NodeProps,
  NodeResizer,
  Position,
  ResizeDragEvent,
} from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { useGetNodeDrawer } from '@/components/flow-node/useGetNodeDrawer.ts'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { NodeType } from '@/store/types.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn'

type Props = PropsWithChildren & NodeProps & { type: NodeType | 'flow' }

export const NodeWrap = observer(
  ({ children, selected, id, type, dragging, data }: Props) => {
    const store = useStore()
    const { open } = useOverlay()

    const drawer = useGetNodeDrawer(id, type)

    const handleResizeEnd = (
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
    }

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

    const handleRemove = () => {
      open(({ isOpen, exit }) => (
        <AlertModal
          isOpen={isOpen}
          onClose={exit}
          onFinish={() => drawer?.removeNode(id, type)}
        />
      ))
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'w-full h-full flex z-[1] relative !bg-background rounded p-3',
            )}
          >
            <div className={'absolute -top-5 text-gray-500 text-xs'}>
              {type === 'flow' && <Map className={'w-4 h-4'} />}
              {type === 'note' && <NotebookPen className={'w-4 h-4'} />}
              {type === 'text' && <Type className={'w-4 h-4'} />}
            </div>
            <NodeResizer
              isVisible
              minWidth={150}
              minHeight={100}
              lineClassName={'!border-transparent !border-2'}
              handleClassName={'!border-transparent !bg-transparent'}
              onResizeEnd={handleResizeEnd}
            />
            <div
              className={
                'border-border border border-dashed z-[1] relative w-full flex flex-col items-center gap-3'
              }
            >
              <div
                className={cn(
                  'relative flex flex-col items-center w-full h-full px-2 pt-2',
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
                {children}
              </div>
            </div>

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
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleRemove}>Remove</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
)

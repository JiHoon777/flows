import { PropsWithChildren, useCallback, useRef } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'
import {
  Handle,
  NodeProps,
  NodeResizer,
  Position,
  ResizeDragEvent,
} from 'reactflow'

import { AlertModal } from '@/components/alert-modal.tsx'
import {
  ContextMenu,
  ContextMenuModel,
  ContextMenuRef,
} from '@/components/context-menu.tsx'
import { NodeContent } from '@/components/flow-node/node-content.tsx'
import { NodeIcon } from '@/components/flow-node/node-icon.tsx'
import { useGetNodeDrawer } from '@/components/flow-node/useGetNodeDrawer.ts'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { useDebounce } from '@/hooks/use-debounce.ts'
import { useStore } from '@/store/useStore.ts'
import { NodeType } from '@/types/base.type.ts'
import { cn } from '@/utils/cn'

type Props = PropsWithChildren & NodeProps & { type: NodeType | 'flow' }

export const NodeWrap = observer(
  ({ children, selected, id, type, dragging, data }: Props) => {
    const store = useStore()
    const { open } = useOverlay()
    const drawer = useGetNodeDrawer(id, type)

    const contextMenuRef = useRef<ContextMenuRef | null>(null)

    const handleFlowNodeResizeEnd = useCallback(
      (
        _: ResizeDragEvent,
        { width, height }: { width: number; height: number },
      ) => {
        Effect.runPromise(
          store.flowStore.updateFlow({
            flowId: id,
            changedFlow: { style: { width, height } },
          }),
        ).catch(store.showError)
        // id, { style: { width, height } }
      },
      [id, store.flowStore, store.showError],
    )

    const handleElseNodeResizeEnd = useCallback(
      (
        _: ResizeDragEvent,
        { width, height }: { width: number; height: number },
      ) => {
        Effect.runPromise(
          store.nodeStore.updateNode({
            nodeId: id,
            changedNode: { style: { width, height } },
          }),
        ).catch(store.showError)
      },
      [id, store.nodeStore, store.showError],
    )

    const updateNodeTitle = useCallback(
      (v: string) => {
        drawer?.updateNodeTitle({
          id,
          type,
          title: v,
        })
      },
      [drawer, id, type],
    )
    const debouncedUpdateNodeTitle = useDebounce(updateNodeTitle, 500)

    const handleRemove = useCallback(() => {
      open(({ isOpen, exit }) => (
        <AlertModal
          isOpen={isOpen}
          onClose={exit}
          onFinish={() => drawer?.removeNode(id, type)}
        />
      ))
    }, [drawer, id, open, type])

    const contextMenuModel: ContextMenuModel = [
      { label: 'Remove ...', command: handleRemove },
    ]

    return (
      <section
        className={cn(
          'relative z-[1] flex h-full w-full rounded !bg-background p-3',
        )}
        onContextMenu={(e) => contextMenuRef.current?.show(e)}
      >
        <NodeIcon type={type} />
        <NodeResizer
          isVisible
          minWidth={150}
          minHeight={100}
          lineClassName={'!border-transparent !border-[10px]'}
          handleClassName={'!border-transparent !bg-transparent'}
          onResizeEnd={
            type === 'flow' ? handleFlowNodeResizeEnd : handleElseNodeResizeEnd
          }
        />

        <NodeContent
          selected={selected}
          dragging={dragging}
          title={data.title}
          onTitleChange={debouncedUpdateNodeTitle}
        >
          {children}
        </NodeContent>

        <Handle
          type="target"
          position={Position.Top}
          className={'!pointer-events-none !top-[50%] !opacity-0'}
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
        <ContextMenu ref={contextMenuRef} model={contextMenuModel} />
      </section>
    )
  },
)

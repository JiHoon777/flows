import { ChangeEvent, PropsWithChildren, useCallback, useRef } from 'react'

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
import { NodeContent } from '@/components/flow-node/node-content.tsx'
import { NodeIcon } from '@/components/flow-node/node-icon.tsx'
import { useGetNodeDrawer } from '@/components/flow-node/useGetNodeDrawer.ts'
import { Menu, MenuModel, MenuRef } from '@/components/menu/menu.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { useDebounce } from '@/hooks/use-debounce.ts'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { DoNode } from '@/store/node/do-node.ts'
import { useStore } from '@/store/useStore.ts'
import { ReactFlowNodeType } from '@/types/base.type.ts'
import { cn } from '@/utils/cn'

type Props = PropsWithChildren & NodeProps & { type: ReactFlowNodeType }

export const NodeWrap = observer(
  ({ children, selected, id, type, dragging }: Props) => {
    const store = useStore()
    const { open } = useOverlay()
    const drawer = useGetNodeDrawer(id, type)
    const origin: DoFlow | DoNode | undefined =
      type === 'flow'
        ? store.flowStore.getFlowById(id)
        : store.nodeStore.getNodeById(id)

    const contextMenuRef = useRef<MenuRef | null>(null)

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
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        drawer?.updateNodeTitle({
          id,
          type,
          title: e.target.value,
        })
      },
      [drawer, id, type],
    )
    const onChangeTitle = useDebounce(updateNodeTitle, 500)

    const handleRemove = useCallback(() => {
      open(({ isOpen, exit }) => (
        <AlertModal
          isOpen={isOpen}
          onClose={exit}
          onFinish={() => drawer?.removeNode(id, type)}
        />
      ))
    }, [drawer, id, open, type])

    const contextMenuModel: MenuModel = [
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
          title={origin?.title}
          onChangeTitle={onChangeTitle}
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
        <Menu ref={contextMenuRef} model={contextMenuModel} />
      </section>
    )
  },
)

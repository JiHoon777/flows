import { PropsWithChildren, useCallback } from 'react'

import { debounce } from 'lodash-es'
import { Map, NotebookPen, Type } from 'lucide-react'
import { observer } from 'mobx-react'
import { Handle, NodeProps, NodeResizer, Position } from 'reactflow'

import { Textarea } from '@/components/ui/textarea'
import { NodeType } from '@/store/types.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn'

type Props = PropsWithChildren & NodeProps

export const NodeWrap = observer(
  ({ children, selected, id, type, data }: Props) => {
    const store = useStore()

    const drawer = (() => {
      if (type === 'flow') {
        const parentFlowId =
          store.flowStore.getFlowById(id)?.parentFlowId ?? '-1'

        return store.flowStore.getFlowById(parentFlowId)?.drawer
      }

      const parentFlowId = store.nodeStore.getNodeById(id)?.parentFlowId ?? '-1'

      return store.flowStore.getFlowById(parentFlowId)?.drawer
    })()

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedChangeHandler = useCallback(
      debounce((v: string) => {
        drawer?.updateNodeTitle({
          id,
          type: type as NodeType | 'flow',
          title: v,
        })
      }, 500),
      [debounce, drawer],
    )

    return (
      <div
        className={cn(
          'w-full h-full flex z-[1] relative !bg-white rounded p-2',
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
          onResizeEnd={(_, { width, height }) => {
            if (type === 'flow') {
              store.flowStore.updateFlow({
                flowId: id,
                changedFlow: { style: { width, height } },
              })
              // id, { style: { width, height } }
              return
            }
            store.nodeStore.updateNode({
              nodeId: id,
              changedNode: { style: { width, height } },
            })
          }}
        />
        <div
          className={
            'border-border border border-dashed z-[1] relative w-full flex flex-col items-center gap-3'
          }
        >
          <Textarea
            className={cn(
              'w-full h-full border-0 py-0.5 px-0.5 rounded',
              'text-sm font-bold bg-transparent text-gray-900 resize-none',
            )}
            defaultValue={data.title}
            onChange={(e) => debouncedChangeHandler(e.target.value)}
          />
          {children}
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
    )
  },
)

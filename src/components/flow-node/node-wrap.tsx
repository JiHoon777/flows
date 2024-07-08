import { PropsWithChildren, useCallback } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/store/store'
import { NodeType } from '@/store/types'
import { cn } from '@/utils/cn'
import { debounce } from 'lodash-es'
import { Map, NotebookPen, Type } from 'lucide-react'
import { Handle, NodeProps, NodeResizer, Position } from 'reactflow'

type Props = PropsWithChildren & NodeProps

export const NodeWrap = ({ children, selected, id, type, data }: Props) => {
  const { updateFlow, updateNode, updateNodeTitle } = useStore((state) => ({
    updateNode: state.updateNode,
    updateFlow: state.updateFlow,
    updateNodeTitle: state.updateNodeTitle,
  }))

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedChangeHandler = useCallback(
    debounce((v: string) => {
      updateNodeTitle(id, type as NodeType | 'flow', v)
    }, 500),
    [debounce, updateNodeTitle],
  )

  return (
    <div
      className={cn('w-full h-full flex z-[1] relative !bg-white rounded p-2')}
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
            updateFlow(id, { style: { width, height } })
            return
          }
          updateNode(id, { style: { width, height } })
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
}

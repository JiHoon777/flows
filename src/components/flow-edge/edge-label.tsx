import { ChangeEvent } from 'react'

import { observer } from 'mobx-react'
import { EdgeLabelRenderer } from 'reactflow'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'

export const EdgeLabel = observer(
  ({
    label,
    selected,
    onTextChange,
    labelX,
    labelY,
  }: {
    label: string
    selected: boolean
    onTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
    labelX: number
    labelY: number
  }) => {
    return (
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan absolute"
        >
          {selected && (
            <FlTextareaAutoSize
              defaultValue={label ?? ''}
              onChange={onTextChange}
              className={
                'max-w-[200px] resize-none rounded border-none bg-background p-1'
              }
            />
          )}
          {!selected && !!label && (
            <div
              className={
                'max-w-[200px] whitespace-pre-wrap break-all rounded bg-background p-1'
              }
            >
              {label || 'Edge Label'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    )
  },
)

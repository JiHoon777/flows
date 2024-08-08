import { SquareX } from 'lucide-react'
import { observer } from 'mobx-react'
import { EdgeLabelRenderer } from 'reactflow'

import { Button } from '@/components/ui/button.tsx'

export const EdgeMenu = observer(
  ({
    labelX,
    labelY,
    onDelete,
  }: {
    labelX: number
    labelY: number
    onDelete: () => void
  }) => {
    return (
      <EdgeLabelRenderer>
        <div
          style={{
            pointerEvents: 'all',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 30}px)`,
          }}
          className="nodrag nopan absolute flex gap-1 rounded-lg bg-background px-1.5 py-1.5 shadow-lg"
        >
          <Button variant={'ghost'} size={'xs'} onClick={onDelete}>
            <SquareX className={'h-4 w-4'} />
          </Button>
        </div>
      </EdgeLabelRenderer>
    )
  },
)

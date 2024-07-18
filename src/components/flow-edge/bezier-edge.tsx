import { ChangeEvent, useCallback } from 'react'

import { debounce } from 'lodash-es'
import { SquareX } from 'lucide-react'
import { observer } from 'mobx-react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow'

import { FlTextareaAutoSize } from '@/components/fl-textarea-auto-size.tsx'
import { EdgeAnimate } from '@/components/flow-edge/edge-animate.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useStore } from '@/store/useStore.ts'

export const BezierEdge = observer((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    source,
    selected,
  } = props
  const store = useStore()
  const { getNode } = useReactFlow()
  const sourceNode = getNode(source)

  const drawer = (() => {
    if (!sourceNode) {
      return
    }

    let parentFlowId = '-1'
    if (sourceNode.type === 'flow') {
      parentFlowId =
        store.flowStore.getFlowById(sourceNode.id)?.parentFlowId ?? '-1'
    } else {
      parentFlowId =
        store.nodeStore.getNodeById(sourceNode.id)?.parentFlowId ?? '-1'
    }

    return store.flowStore.getFlowById(parentFlowId)?.drawer
  })()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onTextChange = useCallback(
    debounce((e: ChangeEvent<HTMLTextAreaElement>) => {
      drawer?.updateEdge(id, { label: e.target.value })
    }, 500),
    [drawer, id],
  )

  const onDelete = useCallback(() => {
    drawer?.deleteEdge(id)
  }, [drawer, id])

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: sourceY + 20,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge path={edgePath} {...props} />
      <EdgeAnimate id={id} style={style} />
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
              defaultValue={data?.label ?? ''}
              onChange={onTextChange}
              className={
                'resize-none bg-background border-none p-1 rounded max-w-[200px]'
              }
            />
          )}
          {!selected && !!data?.label && (
            <div
              className={
                'bg-background p-1 rounded max-w-[200px] break-all whitespace-pre-wrap'
              }
            >
              {data?.label || 'Edge Label'}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 30}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan absolute bg-background shadow-lg px-1.5 py-1.5 rounded-lg flex gap-1"
          >
            <Button variant={'ghost'} size={'xs'} onClick={onDelete}>
              <SquareX className={'w-4 h-4'} />
            </Button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

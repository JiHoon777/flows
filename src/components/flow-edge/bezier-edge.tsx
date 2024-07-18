import { useCallback, useState } from 'react'

import { SquareX, Type } from 'lucide-react'
import { observer } from 'mobx-react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow'

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

  const [isEditing, setIsEditing] = useState(false)

  const onEdgeClick = useCallback((evt: any) => {
    evt.stopPropagation()
    setIsEditing(true)
  }, [])

  const onTextChange = useCallback((evt: any) => {
    // setEdgeText(evt.target.value);
  }, [])

  const onTextBlur = useCallback(() => {
    setIsEditing(false)
    // Here you might want to update the edge data in your state management
  }, [])

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

  console.log(data)
  return (
    <>
      <BaseEdge path={edgePath} {...props} />
      <EdgeAnimate id={id} style={style} />
      {props.selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX - 60}px,${labelY + 20}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan absolute bg-background shadow-lg px-1.5 py-1.5 rounded-lg flex gap-1"
          >
            <Button variant={'ghost'} size={'xs'} onClick={onEdgeClick}>
              <Type className={'w-4 h-4'} />
            </Button>
            <Button variant={'ghost'} size={'xs'} onClick={onDelete}>
              <SquareX className={'w-4 h-4'} />
            </Button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

import { ChangeEvent, useCallback } from 'react'

import { debounce } from 'lodash-es'
import { observer } from 'mobx-react'
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from 'reactflow'

import { EdgeAnimate } from '@/components/flow-edge/edge-animate.tsx'
import { EdgeLabel } from '@/components/flow-edge/edge-label.tsx'
import { EdgeMenu } from '@/components/flow-edge/edge-menu.tsx'
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
      <EdgeLabel
        label={data?.label ?? ''}
        labelX={labelX}
        labelY={labelY}
        selected={!!selected}
        onTextChange={onTextChange}
      />
      {selected && (
        <EdgeMenu labelX={labelX} labelY={labelY} onDelete={onDelete} />
      )}
    </>
  )
})

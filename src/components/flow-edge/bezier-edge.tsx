import { ChangeEvent, useCallback } from 'react'

import { observer } from 'mobx-react'
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from 'reactflow'

import { EdgeAnimate } from '@/components/flow-edge/edge-animate.tsx'
import { EdgeLabel } from '@/components/flow-edge/edge-label.tsx'
import { EdgeMenu } from '@/components/flow-edge/edge-menu.tsx'
import { useGetNodeDrawer } from '@/components/flow-node/useGetNodeDrawer.ts'
import { useDebounce } from '@/hooks/use-debounce.ts'
import { ReactFlowNodeType } from '@/types/base.type.ts'

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
  const { getNode } = useReactFlow()
  const sourceNode = getNode(source)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: sourceY + 20,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const drawer = useGetNodeDrawer(
    sourceNode?.id ?? '-1',
    (sourceNode?.type ?? 'flow') as ReactFlowNodeType,
  )

  const updateEdgeLabel = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      drawer?.updateEdge(id, { label: e.target.value })
    },
    [drawer, id],
  )
  const onChangeLabel = useDebounce(updateEdgeLabel, 500)

  const onDelete = useCallback(() => {
    drawer?.deleteEdge(id)
  }, [drawer, id])

  return (
    <>
      <BaseEdge path={edgePath} {...props} />
      <EdgeAnimate id={id} style={style} />
      <EdgeLabel
        label={data?.label ?? ''}
        labelX={labelX}
        labelY={labelY}
        selected={!!selected}
        onChangeLabel={onChangeLabel}
      />
      {selected && (
        <EdgeMenu labelX={labelX} labelY={labelY} onDelete={onDelete} />
      )}
    </>
  )
})

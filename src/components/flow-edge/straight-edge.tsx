import { BaseEdge, EdgeProps, getStraightPath } from 'reactflow'

export const StraightEdge = (props: EdgeProps) => {
  const { sourceX, sourceY, targetX, targetY } = props

  const [edgePath] = getStraightPath({
    sourceX,
    sourceY: sourceY + 20,
    targetX,
    targetY,
  })

  return <BaseEdge path={edgePath} {...props} />
}

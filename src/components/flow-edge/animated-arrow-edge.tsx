import React from 'react'

import { EdgeProps, getBezierPath } from 'reactflow'

export const AnimatedArrowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const [edgeElement, setEdgeElement] = React.useState<SVGPathElement | null>(
    null,
  )

  const arrowSize = 17
  const animationDuration = 2

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        ref={setEdgeElement}
      />
      {edgeElement && (
        <g>
          <path
            d={`M-${arrowSize / 2},-${arrowSize / 2} L0,0 L-${arrowSize / 2},${arrowSize / 2}`}
            fill="none"
            stroke={style.stroke || 'pink'}
            strokeWidth="3"
          >
            <animateMotion
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath xlinkHref={`#${id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      )}
    </>
  )
}

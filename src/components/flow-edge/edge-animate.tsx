import { CSSProperties } from 'react'

export const EdgeAnimate = ({
  style,
  id,
}: {
  style?: CSSProperties
  id: string
}) => {
  const arrowSize = 17
  const animationDuration = 2
  return (
    <g>
      <path
        d={`M-${arrowSize / 2},-${arrowSize / 2} L0,0 L-${arrowSize / 2},${arrowSize / 2}`}
        fill="none"
        stroke={style?.stroke || 'black'}
        strokeWidth="1"
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
  )
}

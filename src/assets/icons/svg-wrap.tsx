import type { CustomSVGProps } from '@/assets/icons/types.ts'

import clsx from 'clsx'
import React from 'react'

export function SVGWrap({
  size = 18,
  children,
  className,
  title,
  onClick,
  action = false,
  ...props
}: CustomSVGProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    onClick && onClick(e)
  }

  return (
    <i
      style={{
        height: size,
        width: size,
      }}
      title={title}
      onClick={handleClick}
      className={clsx(
        'inline-flex items-center justify-center rounded-sm p-[2px] text-slate-500 transition-all dark:text-slate-500',
        {
          'cursor-pointer hover:bg-slate-300/50 hover:dark:bg-white/10': action,
        },
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: '100%', widows: '100%' }}
        {...props}
      >
        {children}
      </svg>
    </i>
  )
}

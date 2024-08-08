import type { CustomSVGProps } from '@/assets/icons/types.ts'

import { SVGWrap } from '@/assets/icons/svg-wrap.tsx'

export function WindowMaximize(props: CustomSVGProps) {
  return (
    <SVGWrap {...props} viewBox="0 0 24 24">
      <path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z" />
    </SVGWrap>
  )
}

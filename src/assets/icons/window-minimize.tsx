import type { CustomSVGProps } from '@/assets/icons/types.ts'

import { SVGWrap } from '@/assets/icons/svg-wrap.tsx'

export function WindowMinimize(props: CustomSVGProps) {
  return (
    <SVGWrap {...props} viewBox="0 0 24 24">
      <path fill="currentColor" d="M20 14H4v-4h16" />
    </SVGWrap>
  )
}

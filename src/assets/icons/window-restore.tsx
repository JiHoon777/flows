import type { CustomSVGProps } from '@/assets/icons/types.ts'

import { SVGWrap } from '@/assets/icons/svg-wrap.tsx'

export function WindowRestore(props: CustomSVGProps) {
  return (
    <SVGWrap {...props} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M4 8h4V4h12v12h-4v4H4zm12 0v6h2V6h-8v2zM6 12v6h8v-6z"
      />
    </SVGWrap>
  )
}

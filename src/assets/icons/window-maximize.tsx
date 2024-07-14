import { SVGWrap } from '@/assets/icons/svg-wrap.tsx'
import { CustomSVGProps } from '@/assets/icons/types.ts'

export function WindowMaximize(props: CustomSVGProps) {
  return (
    <SVGWrap {...props} viewBox="0 0 24 24">
      <path fill="currentColor" d="M4 4h16v16H4zm2 4v10h12V8z" />
    </SVGWrap>
  )
}

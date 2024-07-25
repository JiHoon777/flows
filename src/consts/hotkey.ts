// Scope 단위로 핫키 교체할 수 있던데 이거 필요하면 나중에 적용
export type HotKeyType = 'GlobalFontSizeUp' | 'GlobalFontSizeDown'

export const HotKeyMap: Record<HotKeyType, string | string[]> = {
  GlobalFontSizeUp: ['meta+=', 'ctrl+='],
  GlobalFontSizeDown: ['meta+minus', 'ctrl+minus'],
}

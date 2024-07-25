import { useHotkeys } from 'react-hotkeys-hook'

import { useStore } from '@/store/useStore.ts'
import { createHotkeyMap } from '@/utils/createHotkeyMap.ts'

type GlobalHotKeyType = 'GlobalFontSizeUp' | 'GlobalFontSizeDown'

const GlobalHotkeyMap = createHotkeyMap<GlobalHotKeyType>({
  GlobalFontSizeUp: ['meta+=', 'ctrl+='],
  GlobalFontSizeDown: ['meta+minus', 'ctrl+minus'],
})

export const RegisterGlobalHotkeys = () => {
  const store = useStore()

  useHotkeys(GlobalHotkeyMap['GlobalFontSizeUp'], () =>
    store.changeFontSize(true),
  )
  useHotkeys(GlobalHotkeyMap['GlobalFontSizeDown'], () =>
    store.changeFontSize(false),
  )

  return null
}

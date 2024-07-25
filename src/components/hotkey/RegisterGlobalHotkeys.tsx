import { useHotkeys } from 'react-hotkeys-hook'

import { HotKeyMap } from '@/consts/hotkey.ts'
import { useStore } from '@/store/useStore.ts'

export const RegisterGlobalHotkeys = () => {
  const store = useStore()

  useHotkeys(HotKeyMap['GlobalFontSizeUp'], () => store.changeFontSize(true))
  useHotkeys(HotKeyMap['GlobalFontSizeDown'], () => store.changeFontSize(false))

  return null
}

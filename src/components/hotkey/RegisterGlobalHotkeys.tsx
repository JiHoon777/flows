import type { OptionsOrDependencyArray } from 'react-hotkeys-hook/dist/types'

import { useHotkeys } from 'react-hotkeys-hook'

import { useStore } from '@/store/useStore.ts'
import { createHotkeyMap } from '@/utils/createHotkeyMap.ts'

type GlobalHotKeyType = 'GlobalFontSizeUp' | 'GlobalFontSizeDown'

const GlobalHotkeyMap = createHotkeyMap<GlobalHotKeyType>({
  GlobalFontSizeDown: ['meta+minus', 'ctrl+minus'],
  GlobalFontSizeUp: ['meta+=', 'ctrl+='],
})

const CommonOptions: OptionsOrDependencyArray = {
  enableOnContentEditable: true,
}

export const RegisterGlobalHotkeys = () => {
  const store = useStore()

  useHotkeys(
    GlobalHotkeyMap['GlobalFontSizeUp'],
    () => store.changeFontSize(true),
    CommonOptions,
  )
  useHotkeys(
    GlobalHotkeyMap['GlobalFontSizeDown'],
    () => store.changeFontSize(false),
    CommonOptions,
  )

  return null
}

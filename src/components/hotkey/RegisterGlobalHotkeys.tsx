import { useHotkeys } from 'react-hotkeys-hook'
import { OptionsOrDependencyArray } from 'react-hotkeys-hook/dist/types'

import { useStore } from '@/store/useStore.ts'
import { createHotkeyMap } from '@/utils/createHotkeyMap.ts'

type GlobalHotKeyType = 'GlobalFontSizeUp' | 'GlobalFontSizeDown'

const GlobalHotkeyMap = createHotkeyMap<GlobalHotKeyType>({
  GlobalFontSizeUp: ['meta+=', 'ctrl+='],
  GlobalFontSizeDown: ['meta+minus', 'ctrl+minus'],
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

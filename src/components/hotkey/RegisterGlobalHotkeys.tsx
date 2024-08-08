import type { OptionsOrDependencyArray } from 'react-hotkeys-hook/dist/types'

import { CAN_USE_DOM } from '@lexical/utils'
import { useHotkeys } from 'react-hotkeys-hook'

import { useStore } from '@/store/useStore.ts'
import { createHotkeyMap } from '@/utils/createHotkeyMap.ts'

type GlobalHotKeyType =
  | 'GlobalFontSizeUp'
  | 'GlobalFontSizeDown'
  | 'DEV__GlobalReload'

const GlobalHotkeyMap = createHotkeyMap<GlobalHotKeyType>({
  DEV__GlobalReload: ['meta+r', 'ctrl+r'],
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
  useHotkeys(
    GlobalHotkeyMap['DEV__GlobalReload'],
    () => CAN_USE_DOM && __DEV__ && window.location.reload(),
    CommonOptions,
  )

  return null
}

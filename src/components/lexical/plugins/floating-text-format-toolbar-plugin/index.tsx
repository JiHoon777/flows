import { Dispatch } from 'react'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { useFloatingTextFormatToolbar } from '@/components/lexical/plugins/floating-text-format-toolbar-plugin/use-floating-text-format-toolbar.tsx'

export const FloatingTextFormatToolbarPlugin = ({
  anchorElem = document.body,
  setIsLinkEditMode,
}: {
  anchorElem?: HTMLElement
  setIsLinkEditMode: Dispatch<boolean>
}) => {
  const [editor] = useLexicalComposerContext()

  return useFloatingTextFormatToolbar(editor, anchorElem, setIsLinkEditMode)
}

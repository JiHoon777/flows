import type { Dispatch } from 'react'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { useFloatingLinkEditorToolbar } from '@/components/lexical/plugins/floating-link-editor-plugin/use-floating-link-editor-toolbar.tsx'

export const FloatingLinkEditorPlugin = ({
  anchorElem,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  anchorElem: HTMLElement
  isLinkEditMode: boolean
  setIsLinkEditMode: Dispatch<boolean>
}) => {
  const [editor] = useLexicalComposerContext()

  return useFloatingLinkEditorToolbar(
    editor,
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode,
  )
}

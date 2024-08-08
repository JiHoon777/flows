import type { LexicalEditor } from 'lexical'
import type { Dispatch } from 'react'

import { $isAutoLinkNode, $isLinkNode } from '@lexical/link'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { useEffect, useState } from 'react'

import { FloatingLinkEditor } from '@/components/lexical/plugins/floating-link-editor-plugin/floating-link-editor.tsx'
import { lexicalUtils } from '@/components/lexical/utils/lexical.utils.ts'
import { Portal } from '@/components/portal.tsx'

export const useFloatingLinkEditorToolbar = (
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isLinkEditMode: boolean,
  setIsLinkEditMode: Dispatch<boolean>,
) => {
  const [activeEditor, setActiveEditor] = useState(editor)
  const [isLink, setIsLink] = useState(false)

  useEffect(() => {
    function $updateToolbar() {
      const selection = $getSelection()

      if (!$isRangeSelection(selection)) {
        return
      }

      const focusNode = lexicalUtils.getSelectedNode(selection)
      const focusLinkNode = $findMatchingParent(focusNode, $isLinkNode)
      const focusAutoLinkNode = $findMatchingParent(focusNode, $isAutoLinkNode)
      if (!(focusLinkNode || focusAutoLinkNode)) {
        setIsLink(false)
        return
      }
      const badNode = selection
        .getNodes()
        .filter((node) => !$isLineBreakNode(node))
        .find((node) => {
          const linkNode = $findMatchingParent(node, $isLinkNode)
          const autoLinkNode = $findMatchingParent(node, $isAutoLinkNode)
          return (
            (focusLinkNode && !focusLinkNode.is(linkNode)) ||
            (linkNode && !linkNode.is(focusLinkNode)) ||
            (focusAutoLinkNode && !focusAutoLinkNode.is(autoLinkNode)) ||
            (autoLinkNode &&
              (!autoLinkNode.is(focusAutoLinkNode) ||
                autoLinkNode.getIsUnlinked()))
          )
        })
      if (!badNode) {
        setIsLink(true)
      } else {
        setIsLink(false)
      }
    }

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          $updateToolbar()
          setActiveEditor(newEditor)
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const node = lexicalUtils.getSelectedNode(selection)
            const linkNode = $findMatchingParent(node, $isLinkNode)
            if ($isLinkNode(linkNode) && (payload.metaKey || payload.ctrlKey)) {
              window.open(linkNode.getURL(), '_blank')
              return true
            }
          }

          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  if (!isLink) {
    return null
  }

  return (
    <Portal containerEl={anchorElem}>
      <FloatingLinkEditor
        editor={activeEditor}
        isLink={isLink}
        anchorElem={anchorElem}
        setIsLink={setIsLink}
        isLinkEditMode={isLinkEditMode}
        setIsLinkEditMode={setIsLinkEditMode}
      />
    </Portal>
  )
}

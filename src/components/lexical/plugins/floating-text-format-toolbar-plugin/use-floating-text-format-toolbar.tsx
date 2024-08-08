import type { LexicalEditor } from 'lexical'
import type { Dispatch } from 'react'

import { $isCodeHighlightNode } from '@lexical/code'
import { $isLinkNode } from '@lexical/link'
import { mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical'
import { useCallback, useEffect, useState } from 'react'

import { TextFormatFloatingToolbar } from '@/components/lexical/plugins/floating-text-format-toolbar-plugin/text-format-floating-toolbar.tsx'
import { lexicalUtils } from '@/components/lexical/utils/lexical.utils.ts'
import { Portal } from '@/components/portal.tsx'

export const useFloatingTextFormatToolbar = (
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  setIsLinkEditMode: Dispatch<boolean>,
) => {
  const [isText, setIsText] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isCode, setIsCode] = useState(false)

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // IME 입력 중에는 툴바를 업데이트하지 않는다.
      if (editor.isComposing()) {
        return
      }

      const selection = $getSelection()
      const nativeSelection = window.getSelection()
      const rootElement = editor.getRootElement()

      // 선택 영역이 유효하지 않거나, 선택 영역이 에디터 루트 요소에 포함되지 않는 경우
      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false)
        return
      }

      // 선택 영역이 유효한 범위 선택이 아닌 경우
      if (!$isRangeSelection(selection)) {
        return
      }

      const node = lexicalUtils.getSelectedNode(selection)

      // Update Text Format
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsSubscript(selection.hasFormat('subscript'))
      setIsSuperscript(selection.hasFormat('superscript'))
      setIsCode(selection.hasFormat('code'))

      // Update Links
      const parent = node.getParent()
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true)
      } else {
        setIsLink(false)
      }

      // 텍스트 노드 또는 문단 노드가 선택된 경우
      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ''
      ) {
        setIsText($isTextNode(node) || $isParagraphNode(node))
      } else {
        setIsText(false)
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, '')
      if (!selection.isCollapsed() && rawTextContent === '') {
        setIsText(false)
        return
      }
    })
  }, [editor])

  // selectionchange 이벤트 리스너를 등록하여 선택 영역 변경 시 팝업 업데이트
  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup)

    return () => {
      document.removeEventListener('selectionchange', updatePopup)
    }
  }, [updatePopup])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup()
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false)
        }
      }),
    )
  }, [editor, updatePopup])

  if (!isText) {
    return null
  }

  return (
    <Portal containerEl={anchorElem}>
      <TextFormatFloatingToolbar
        editor={editor}
        anchorElem={anchorElem}
        isLink={isLink}
        isBold={isBold}
        isItalic={isItalic}
        isStrikethrough={isStrikethrough}
        isSubscript={isSubscript}
        isSuperscript={isSuperscript}
        isUnderline={isUnderline}
        isCode={isCode}
        setIsLinkEditMode={setIsLinkEditMode}
      />
    </Portal>
  )
}

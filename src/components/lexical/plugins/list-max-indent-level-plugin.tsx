import { useEffect } from 'react'

import { $getListDepth, $isListItemNode, $isListNode } from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  ElementNode,
  INDENT_CONTENT_COMMAND,
  RangeSelection,
} from 'lexical'

/**
 * @desc 리스트의 깊이를 제한
 **/
export const ListMaxIndentLevelPlugin = ({
  maxDepth,
}: {
  maxDepth: number
}) => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => $shouldPreventIndent(maxDepth),
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, maxDepth])

  return null
}

function getElementNodesInSelection(
  selection: RangeSelection,
): Set<ElementNode> {
  const nodesInSelection = selection.getNodes()

  if (nodesInSelection.length === 0) {
    return new Set([
      selection.anchor.getNode().getParentOrThrow(),
      selection.focus.getNode().getParentOrThrow(),
    ])
  }

  return new Set(
    nodesInSelection.map((n) => ($isElementNode(n) ? n : n.getParentOrThrow())),
  )
}

/**
 * maxDepth 값과 현재 선택된 목록 항목의 깊이를 비교하여, 선택된 항목의 들여쓰기가 최대 깊이를 초과할 경우 들여쓰기를 방지하는 기능을 수행합니다.
 */
function $shouldPreventIndent(maxDepth: number): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) {
    return false
  }

  const elementNodesInSelection: Set<ElementNode> =
    getElementNodesInSelection(selection)

  let totalDepth = 0

  for (const elementNode of elementNodesInSelection) {
    if ($isListNode(elementNode)) {
      totalDepth = Math.max($getListDepth(elementNode) + 1, totalDepth)
    } else if ($isListItemNode(elementNode)) {
      const parent = elementNode.getParent()

      if (!$isListNode(parent)) {
        throw new Error(
          'ListMaxIndentLevelPlugin: A ListItemNode must have a ListNode for a parent.',
        )
      }

      totalDepth = Math.max($getListDepth(parent) + 1, totalDepth)
    }
  }

  return totalDepth > maxDepth
}

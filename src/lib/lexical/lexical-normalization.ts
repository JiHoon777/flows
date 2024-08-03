import type {
  PointType,
  RangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import type { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

import { getActiveEditor } from '@/lib/lexical/lexical-updates.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

/**
 * 정규화의 의미
 * 텍스트 노드 정규화 ($normalizeTextNode):
 *
 * 목적: 텍스트 노드의 일관성을 유지하고 불필요한 텍스트 노드를 제거하며, 병합 가능한 텍스트 노드를 병합합니다.
 * 주요 작업:
 *  비어 있는 노드 제거: 텍스트가 비어 있는 단순 텍스트 노드를 제거합니다.
 *  이전 및 다음 형제 노드 병합: 현재 노드와 이전/다음 형제 노드가 병합 가능한지 확인하고, 병합 가능한 경우 병합합니다.
 *
 *
 * 선택 영역 정규화 ($normalizeSelection):
 *
 * 목적: 선택 영역의 앵커와 포커스 포인트가 유효한 텍스트 또는 요소 노드를 가리키도록 조정합니다.
 * 주요 작업:
 *  포인트 정규화: 앵커와 포커스 포인트가 텍스트 노드 또는 요소 노드를 정확하게 가리키도록 조정합니다. 포인트가 요소 노드일 경우, 해당 요소의 자식 노드를 확인하여 적절한 텍스트 노드 또는 요소 노드를 가리키도록 합니다.
 *
 *
 * 포인트 정규화 ($normalizePoint):
 *
 * 목적: 포인트(선택 영역의 시작 또는 끝)가 유효한 텍스트 노드나 요소 노드를 가리키도록 조정합니다.
 * 주요 작업:
 * 텍스트 노드 조정: 포인트가 요소 노드를 가리키는 경우, 해당 요소의 자식 노드를 탐색하여 적절한 텍스트 노드로 조정합니다. 포인트가 텍스트 노드를 가리키는 경우, 포인트를 텍스트 노드의 시작 또는 끝으로 이동합니다.
 * 요약
 * 정규화는 텍스트 노드와 선택 영역을 표준화된 형태로 변환하여 일관성과 무결성을 유지하는 과정입니다. 이를 통해 데이터가 예상대로 작동하도록 하고, 불필요한 데이터가 제거되며, 필요한 경우 병합 작업을 수행하여 데이터의 일관성을 보장합니다.
 */

/**
 * 단순 텍스트 노드가 병합될 수 있는지 여부를 확인합니다.
 *
 * @desc 이 함수는 두 텍스트 노드의 모드, 형식, 스타일이 일치하는지 확인하여
 * 단순 텍스트 노드가 병합될 수 있는지를 결정합니다.
 *
 * @param node1 - 첫 번째 텍스트 노드입니다.
 * @param node2 - 두 번째 텍스트 노드입니다.
 * @returns 두 노드가 병합될 수 있으면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
function $canSimpleTextNodesBeMerged(
  node1: TextNode,
  node2: TextNode,
): boolean {
  const node1Mode = node1.__mode
  const node1Format = node1.__format
  const node1Style = node1.__style
  const node2Mode = node2.__mode
  const node2Format = node2.__format
  const node2Style = node2.__style
  return (
    (node1Mode === null || node1Mode === node2Mode) &&
    (node1Format === null || node1Format === node2Format) &&
    (node1Style === null || node1Style === node2Style)
  )
}

/**
 * 두 텍스트 노드를 병합합니다.
 *
 * @desc 이 함수는 첫 번째 텍스트 노드와 두 번째 텍스트 노드를 병합하고,
 * 병합된 결과를 반환합니다. 병합된 노드는 활성 에디터의 정규화된 노드로 표시됩니다.
 *
 * @param node1 - 첫 번째 텍스트 노드입니다.
 * @param node2 - 두 번째 텍스트 노드입니다.
 * @returns 병합된 텍스트 노드를 반환합니다.
 */
function $mergeTextNodes(node1: TextNode, node2: TextNode): TextNode {
  const writableNode1 = node1.mergeWithSibling(node2)

  const normalizedNodes = getActiveEditor()._normalizedNodes

  normalizedNodes.add(node1.__key)
  normalizedNodes.add(node2.__key)
  return writableNode1
}

/**
 * 텍스트 노드를 정규화합니다.
 *
 * @desc 이 함수는 텍스트 노드가 비어 있거나 단순 텍스트인 경우 제거합니다.
 * 그런 다음, 텍스트 노드의 이전 및 다음 형제 노드를 확인하여 병합 가능성을 평가하고,
 * 필요에 따라 병합합니다.
 *
 * @param textNode - 정규화할 텍스트 노드입니다.
 */
export function $normalizeTextNode(textNode: TextNode): void {
  let node = textNode

  if (node.__text === '' && node.isSimpleText() && !node.isUnmergeable()) {
    node.remove()
    return
  }

  // Backward
  let previousNode

  while (
    (previousNode = node.getPreviousSibling()) !== null &&
    $isTextNode(previousNode) &&
    previousNode.isSimpleText() &&
    !previousNode.isUnmergeable()
  ) {
    if (previousNode.__text === '') {
      previousNode.remove()
    } else if ($canSimpleTextNodesBeMerged(previousNode, node)) {
      node = $mergeTextNodes(previousNode, node)
      break
    } else {
      break
    }
  }

  // Forward
  let nextNode

  while (
    (nextNode = node.getNextSibling()) !== null &&
    $isTextNode(nextNode) &&
    nextNode.isSimpleText() &&
    !nextNode.isUnmergeable()
  ) {
    if (nextNode.__text === '') {
      nextNode.remove()
    } else if ($canSimpleTextNodesBeMerged(node, nextNode)) {
      node = $mergeTextNodes(node, nextNode)
      break
    } else {
      break
    }
  }
}

/**
 * 선택 영역을 정규화합니다.
 *
 * @desc 이 함수는 선택 영역의 앵커와 포커스 포인트를 정규화합니다.
 * 각 포인트는 텍스트 노드나 요소 노드에 맞춰 조정됩니다.
 *
 * @param selection - 정규화할 선택 영역입니다.
 * @returns 정규화된 선택 영역을 반환합니다.
 */
export function $normalizeSelection(selection: RangeSelection): RangeSelection {
  $normalizePoint(selection.anchor)
  $normalizePoint(selection.focus)
  return selection
}

/**
 * 포인트를 정규화합니다.
 *
 * @desc 이 함수는 포인트가 텍스트 노드나 요소 노드에 맞춰 조정되도록 정규화합니다.
 * 포인트가 요소인 경우, 해당 요소의 자식 노드 중 텍스트 노드를 찾습니다.
 * 그런 다음, 포인트를 해당 텍스트 노드의 시작 또는 끝으로 이동합니다.
 *
 * @param point - 정규화할 포인트입니다.
 */
function $normalizePoint(point: PointType): void {
  while (point.type === 'element') {
    const node = point.getNode()
    const offset = point.offset
    let nextNode
    let nextOffsetAtEnd
    if (offset === node.getChildrenSize()) {
      nextNode = node.getChildAtIndex(offset - 1)
      nextOffsetAtEnd = true
    } else {
      nextNode = node.getChildAtIndex(offset)
      nextOffsetAtEnd = false
    }
    if ($isTextNode(nextNode)) {
      point.set(
        nextNode.__key,
        nextOffsetAtEnd ? nextNode.getTextContentSize() : 0,
        'text',
      )
      break
    } else if (!$isElementNode(nextNode)) {
      break
    }
    point.set(
      nextNode.__key,
      nextOffsetAtEnd ? nextNode.getChildrenSize() : 0,
      'element',
    )
  }
}

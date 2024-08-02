import type { LexicalNode, NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

import { $getNodeByKey } from '@/lib/lexical/lexical-node.ts'
import {
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from '@/lib/lexical/lexical-updates.ts'
import {
  $getCompositionKey,
  $setCompositionKey,
} from '@/lib/lexical/lexical-utils.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'

export type TextPointType = {
  _selection: BaseSelection
  getNode: () => TextNode
  is: (point: PointType) => boolean
  isBefore: (point: PointType) => boolean
  key: NodeKey
  offset: number
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void
  type: 'text'
}

export type ElementPointType = {
  _selection: BaseSelection
  getNode: () => ElementNode
  is: (point: PointType) => boolean
  isBefore: (point: PointType) => boolean
  key: NodeKey
  offset: number
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void
  type: 'element'
}

export type PointType = TextPointType | ElementPointType

export class Point {
  key: NodeKey
  offset: number
  type: 'text' | 'element'
  _selection: BaseSelection | null

  constructor(key: NodeKey, offset: number, type: 'text' | 'element') {
    this._selection = null
    this.key = key
    this.offset = offset
    this.type = type
  }

  is(point: PointType): boolean {
    return (
      this.key === point.key &&
      this.offset === point.offset &&
      this.type === point.type
    )
  }

  /**
   * 현재 포인트가 주어진 포인트보다 앞에 있는지 확인합니다.
   *
   * @param b - 비교할 대상 포인트
   * @returns 현재 포인트가 b보다 앞에 있으면 true, 그렇지 않으면 false
   *
   * @description
   * 1. ElementNode 의 경우, 해당 오프셋의 자식 노드로 이동합니다.
   * 2. 같은 노드 내에서는 오프셋을 비교합니다.
   * 3. 다른 노드 간에는 노드의 순서를 비교합니다.
   */
  isBefore(b: PointType): boolean {
    let aNode = this.getNode()
    let bNode = b.getNode()
    const aOffset = this.offset
    const bOffset = b.offset

    if ($isElementNode(aNode)) {
      const aNodeDescendant = aNode.getDescendantByIndex<ElementNode>(aOffset)
      aNode = aNodeDescendant != null ? aNodeDescendant : aNode
    }
    if ($isElementNode(bNode)) {
      const bNodeDescendant = bNode.getDescendantByIndex<ElementNode>(bOffset)
      bNode = bNodeDescendant != null ? bNodeDescendant : bNode
    }
    if (aNode === bNode) {
      return aOffset < bOffset
    }
    return aNode.isBefore(bNode)
  }

  getNode(): LexicalNode {
    const key = this.key
    const node = $getNodeByKey(key)
    if (node === null) {
      invariant(false, 'Point.getNode: node not found')
    }
    return node
  }

  /**
   * 포인트의 키, 오프셋, 타입을 설정하고 관련 상태를 업데이트합니다.
   *
   * @param key - 설정할 노드 키
   * @param offset - 설정할 오프셋
   * @param type - 설정할 타입 ('text' 또는 'element')
   *
   * @description
   * 1. 포인트의 키, 오프셋, 타입을 업데이트합니다.
   * 2. 읽기 전용 모드가 아닌 경우:
   *    - 필요시 컴포지션 키를 업데이트합니다.
   *    - 선택 영역이 있다면 캐시된 노드를 초기화하고 dirty 플래그를 설정합니다.
   */
  set(key: NodeKey, offset: number, type: 'text' | 'element'): void {
    const selection = this._selection
    const oldKey = this.key
    this.key = key
    this.offset = offset
    this.type = type
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key)
      }
      if (selection !== null) {
        selection.setCachedNodes(null)
        selection.dirty = true
      }
    }
  }
}

export function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type)
}

export interface BaseSelection {
  _cachedNodes: LexicalNode[] | null
  dirty: boolean

  clone(): BaseSelection
  extract(): LexicalNode[]
  getNodes(): LexicalNode[]
  getTextContent(): string
  insertText(text: string): void
  insertRawText(text: string): void
  is(selection: null | BaseSelection): boolean
  insertNodes(nodes: LexicalNode[]): void
  getStartEndPoints(): null | [PointType, PointType]
  isCollapsed(): boolean
  isBackward(): boolean
  getCachedNodes(): LexicalNode[] | null
  setCachedNodes(nodes: LexicalNode[] | null): void
}

export function $getSelection(): null | BaseSelection {
  const editorState = getActiveEditorState()
  return editorState._selection
}

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>
  _cachedNodes: Array<LexicalNode> | null
  dirty: boolean

  constructor(objects: Set<NodeKey>) {
    this._cachedNodes = null
    this._nodes = objects
    this.dirty = false
  }
}

export function $isNodeSelection(x: unknown): x is NodeSelection {
  return x instanceof NodeSelection
}

export class RangeSelection implements BaseSelection {
  format: number
  style: string
  anchor: PointType
  focus: PointType
  _cachedNodes: Array<LexicalNode> | null
  dirty: boolean

  constructor(
    anchor: PointType,
    focus: PointType,
    format: number,
    style: string,
  ) {
    this.anchor = anchor
    this.focus = focus
    anchor._selection = this
    focus._selection = this
    this._cachedNodes = null
    this.format = format
    this.style = style
    this.dirty = false
  }

  isCollapsed(): boolean {
    return this.anchor.is(this.focus)
  }

  isBackward(): boolean {
    return this.focus.isBefore(this.anchor)
  }
}

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection
}

export function $internalMakeRangeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
  anchorType: 'text' | 'element',
  focusType: 'text' | 'element',
): RangeSelection {
  const editorState = getActiveEditorState()
  const selection = new RangeSelection(
    $createPoint(anchorKey, anchorOffset, anchorType),
    $createPoint(focusKey, focusOffset, focusType),
    0,
    '',
  )
  selection.dirty = true
  editorState._selection = selection
  return selection
}

/**
 * @desc selection condition
 * 네, 이 조건문이 복잡해 보일 수 있습니다. 이 부분을 자세히 설명해 드리겠습니다.
 * 이 조건문의 목적은 선택 영역을 업데이트해야 하는 상황을 정확히 파악하는 것입니다. 두 가지 시나리오를 고려합니다:
 *
 * nodeOffset <= firstPointOffset && times > 0:
 *
 * 이는 노드를 삽입하는 경우입니다.
 * nodeOffset 이 firstPointOffset 보다 작거나 같다는 것은 새 노드가 현재 선택 영역의 시작 지점 이전이나 정확히 그 지점에 삽입된다는 의미입니다.
 * times > 0는 하나 이상의 노드가 삽입됨을 나타냅니다.
 * 이 경우, 선택 영역의 시작 지점을 오른쪽으로 이동시켜야 합니다.
 *
 *
 * nodeOffset < firstPointOffset && times < 0:
 *
 * 이는 노드를 삭제하는 경우입니다.
 * nodeOffset 이 firstPointOffset 보다 작다는 것은 삭제되는 노드가 현재 선택 영역의 시작 지점 이전에 있다는 의미입니다.
 * times < 0는 하나 이상의 노드가 삭제됨을 나타냅니다.
 * 이 경우, 선택 영역의 시작 지점을 왼쪽으로 이동시켜야 합니다.
 *
 *
 *
 * 이 조건문이 필요한 이유는 다음과 같습니다:
 *
 * 노드 삽입/삭제 위치가 현재 선택 영역에 영향을 미치는지 확인합니다.
 * 삽입과 삭제를 구분하여 선택 영역을 적절하게 조정합니다.
 * 선택 영역의 시작 지점이 변경되어야 하는 경우만 업데이트합니다.
 *
 * 예를 들어:
 *
 * 노드를 선택 영역 이후에 삽입하는 경우, 선택 영역을 변경할 필요가 없습니다.
 * 노드를 선택 영역 이전에 삭제하는 경우, 선택 영역의 시작 지점을 왼쪽으로 이동시켜야 합니다.
 *
 * 이 조건문은 이러한 다양한 시나리오를 정확하게 처리하여 문서 편집 시 선택 영역의 일관성을 유지하는 데 중요한 역할을 합니다.
 */
/**
 * 노드 생성 또는 삭제 시 요소 선택을 업데이트합니다.
 *
 * @param selection - 업데이트할 범위 선택
 * @param parentNode - 부모 노드
 * @param nodeOffset - 노드의 오프셋
 * @param times - 선택을 이동할 횟수 (기본값: 1)
 */
export function $updateElementSelectionOnCreateDeleteNode(
  selection: RangeSelection,
  parentNode: LexicalNode,
  nodeOffset: number,
  times = 1,
): void {
  const anchor = selection.anchor
  const focus = selection.focus
  const anchorNode = anchor.getNode()
  const focusNode = focus.getNode()

  // 부모 노드가 선택의 앵커나 포커스 노드가 아니면 종료
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return
  }

  const parentKey = parentNode.__key
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset
    if (
      (nodeOffset <= selectionOffset && times > 0) ||
      (nodeOffset < selectionOffset && times < 0)
    ) {
      const newSelectionOffset = Math.max(0, selectionOffset + times)
      anchor.set(parentKey, newSelectionOffset, 'element')
      focus.set(parentKey, newSelectionOffset, 'element')
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection)
    }
    // Multiple nodes selected. We shift or redimension selection
  } else {
    const isBackward = selection.isBackward()
    const firstPoint = isBackward ? focus : anchor
    const firstPointNode = firstPoint.getNode()
    const lastPoint = isBackward ? anchor : focus
    const lastPointNode = lastPoint.getNode()

    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset
      if (
        (nodeOffset <= firstPointOffset && times > 0) ||
        (nodeOffset < firstPointOffset && times < 0)
      ) {
        firstPoint.set(
          parentKey,
          Math.max(0, firstPointOffset + times),
          'element',
        )
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset
      if (
        (nodeOffset <= lastPointOffset && times > 0) ||
        (nodeOffset < lastPointOffset && times < 0)
      ) {
        lastPoint.set(
          parentKey,
          Math.max(0, lastPointOffset + times),
          'element',
        )
      }
    }
  }

  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection)
}

/**
 * 선택 영역의 텍스트 노드를 해결합니다.
 * 이 함수는 선택 영역이 요소 노드를 가리키고 있을 때 텍스트 노드로 조정하는 역할을 합니다.
 *
 * @param selection - 해결할 범위 선택
 */
function $updateSelectionResolveTextNodes(selection: RangeSelection): void {
  const anchor = selection.anchor
  const anchorOffset = anchor.offset
  const focus = selection.focus
  const focusOffset = focus.offset
  const anchorNode = anchor.getNode()
  const focusNode = focus.getNode()

  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return
    }
    const childSize = anchorNode.getChildrenSize()
    const anchorOffsetAtEnd = anchorOffset >= childSize
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset)
    if ($isTextNode(child)) {
      let newOffset = 0
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize()
      }
      anchor.set(child.__key, newOffset, 'text')
      focus.set(child.__key, newOffset, 'text')
    }
    return
  }

  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize()
    const anchorOffsetAtEnd = anchorOffset >= childSize
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset)
    if ($isTextNode(child)) {
      let newOffset = 0
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize()
      }
      anchor.set(child.__key, newOffset, 'text')
    }
  }

  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize()
    const focusOffsetAtEnd = focusOffset >= childSize
    const child = focusOffsetAtEnd
      ? focusNode.getChildAtIndex(childSize - 1)
      : focusNode.getChildAtIndex(focusOffset)
    if ($isTextNode(child)) {
      let newOffset = 0
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize()
      }
      focus.set(child.__key, newOffset, 'text')
    }
  }
}

/**
 * 선택 포인트를 형제 노드로 이동시키는 함수
 *
 * @param point - 이동시킬 선택 포인트
 * @param node - 현재 노드
 * @param parent - 부모 노드
 * @param prevSibling - 이전 형제 노드
 * @param nextSibling - 다음 형제 노드
 *
 * @description
 * 이 함수는 주어진 선택 포인트를 적절한 형제 노드로 이동시킵니다.
 * 주요 동작:
 * 1. 이전 형제 노드가 있으면 그 노드의 끝으로 포인트를 이동
 * 2. 이전 형제 노드가 없고 다음 형제 노드가 있으면 그 노드의 시작으로 포인트를 이동
 * 3. 형제 노드가 없으면 부모 노드 내에서 적절한 위치로 포인트를 이동
 *
 * 텍스트 노드와 엘리먼트 노드를 구분하여 처리하며,
 * 각 경우에 맞는 오프셋과 타입을 설정합니다.
 */
export function moveSelectionPointToSibling(
  point: PointType,
  node: LexicalNode,
  parent: ElementNode,
  prevSibling: LexicalNode | null,
  nextSibling: LexicalNode | null,
): void {
  let siblingKey = null
  let offset = 0
  let type: 'text' | 'element' | null = null
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize()
      type = 'text'
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize()
      type = 'element'
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key
      if ($isTextNode(nextSibling)) {
        type = 'text'
      } else if ($isElementNode(nextSibling)) {
        type = 'element'
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type)
  } else {
    offset = node.getIndexWithinParent()
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize()
    }
    point.set(parent.__key, offset, 'element')
  }
}

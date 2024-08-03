import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type { LexicalNode, NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { TextFormatType } from '@/lib/lexical/nodes/lexical-text-node.type.ts'

import { SELECTION_CHANGE_COMMAND } from '@/lib/lexical/lexical-commands.ts'
import {
  DOM_ELEMENT_TYPE,
  TEXT_TYPE_TO_FORMAT,
} from '@/lib/lexical/lexical-constants.ts'
import {
  markCollapsedSelectionFormat,
  markSelectionChangeFromDOMUpdate,
} from '@/lib/lexical/lexical-events.ts'
import { getIsProcessingMutations } from '@/lib/lexical/lexical-mutations.ts'
import { insertRangeAfter } from '@/lib/lexical/lexical-node.ts'
import { $getNodeByKey } from '@/lib/lexical/lexical-node.ts'
import {
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from '@/lib/lexical/lexical-updates.ts'
import {
  $getAdjacentNode,
  $getAncestor,
  $getCompositionKey,
  $getNearestRootOrShadowRoot,
  $getNodeFromDOM,
  $getRoot,
  $hasAncestor,
  $isTokenOrSegmented,
  $setCompositionKey,
  $setSelection,
  doesContainGrapheme,
  getDOMSelection,
  getDOMTextNode,
  getElementByKeyOrThrow,
  getTextNodeOffset,
  INTERNAL_$isBlock,
  isSelectionCapturedInDecoratorInput,
  isSelectionWithinEditor,
  removeDOMBlockCursorElement,
  scrollIntoViewIfNeeded,
  toggleTextFormatType,
} from '@/lib/lexical/lexical-utils.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import {
  $createLineBreakNode,
  $isLineBreakNode,
} from '@/lib/lexical/nodes/lexical-line-break-node.ts'
import { $createParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import {
  $createTabNode,
  $isTabNode,
} from '@/lib/lexical/nodes/lexical-tab-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import {
  $createTextNode,
  TextNode,
} from '@/lib/lexical/nodes/lexical-text-node.ts'
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

/**
 * 주어진 노드에 대해 선택 포인트를 설정합니다.
 *
 * @param point - 설정할 선택 포인트
 * @param node - 선택 포인트를 설정할 대상 노드
 */
function selectPointOnNode(point: PointType, node: LexicalNode): void {
  let key = node.__key
  let offset = point.offset
  let type: 'element' | 'text' = 'element'
  if ($isTextNode(node)) {
    type = 'text'
    const textContentLength = node.getTextContentSize()
    if (offset > textContentLength) {
      offset = textContentLength
    }
    // 노드가 TextNode 도 ElementNode 도 아닌 경우
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling()
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key
      offset = 0
      type = 'text'
    } else {
      const parentNode = node.getParent()
      if (parentNode) {
        key = parentNode.__key
        offset = node.getIndexWithinParent() + 1
      }
    }
  }
  point.set(key, offset, type)
}
/**
 * 선택 포인트를 주어진 노드의 끝으로 이동시킵니다.
 *
 * @param point - 이동시킬 선택 포인트
 * @param node - 선택 포인트를 이동시킬 대상 노드
 */
export function $moveSelectionPointToEnd(
  point: PointType,
  node: LexicalNode,
): void {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant()
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode)
    } else {
      selectPointOnNode(point, node)
    }
  } else {
    selectPointOnNode(point, node)
  }
}
/**
 * 시작 요소 포인트를 텍스트 포인트로 변환합니다.
 *
 * @desc 이 함수는 주어진 시작 요소 포인트를 기반으로 새로운 텍스트 노드를 생성하고,
 * 이를 시작 요소 포인트의 위치에 삽입합니다. 텍스트 노드에 주어진 형식과 스타일을 설정하고,
 * 시작 포인트와 종료 포인트를 텍스트 포인트로 업데이트합니다.
 *
 * @param start - 변환할 시작 요소 포인트입니다.
 * @param end - 변환할 종료 포인트입니다.
 * @param format - 새로운 텍스트 노드에 적용할 형식입니다.
 * @param style - 새로운 텍스트 노드에 적용할 스타일입니다.
 */
function $transferStartingElementPointToTextPoint(
  start: ElementPointType,
  end: PointType,
  format: number,
  style: string,
): void {
  const element = start.getNode()
  const placementNode = element.getChildAtIndex(start.offset)
  const textNode = $createTextNode()
  const target = $isRootNode(element)
    ? $createParagraphNode().append(textNode)
    : textNode
  textNode.setFormat(format)
  textNode.setStyle(style)
  if (placementNode === null) {
    element.append(target)
  } else {
    placementNode.insertBefore(target)
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text')
  }
  start.set(textNode.__key, 0, 'text')
}

function $setPointValues(
  point: PointType,
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): void {
  point.key = key
  point.offset = offset
  point.type = type
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

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>
  _cachedNodes: Array<LexicalNode> | null
  dirty: boolean

  constructor(objects: Set<NodeKey>) {
    this._cachedNodes = null
    this._nodes = objects
    this.dirty = false
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes
  }

  is(selection: null | BaseSelection): boolean {
    if (!$isNodeSelection(selection)) {
      return false
    }
    const a: Set<NodeKey> = this._nodes
    const b: Set<NodeKey> = selection._nodes
    return a.size === b.size && Array.from(a).every((key) => b.has(key))
  }

  isCollapsed(): boolean {
    return false
  }

  isBackward(): boolean {
    return false
  }

  getStartEndPoints(): null {
    return null
  }

  add(key: NodeKey): void {
    this.dirty = true
    this._nodes.add(key)
    this._cachedNodes = null
  }

  delete(key: NodeKey): void {
    this.dirty = true
    this._nodes.delete(key)
    this._cachedNodes = null
  }

  clear(): void {
    this.dirty = true
    this._nodes.clear()
    this._cachedNodes = null
  }

  has(key: NodeKey): boolean {
    return this._nodes.has(key)
  }

  clone(): NodeSelection {
    return new NodeSelection(new Set(this._nodes))
  }

  extract(): Array<LexicalNode> {
    return this.getNodes()
  }

  insertRawText(_text: string): void {
    // Do nothing?
  }

  insertText(): void {
    // Do nothing?
  }

  insertNodes(nodes: Array<LexicalNode>) {
    const selectedNodes = this.getNodes()
    const selectedNodesLength = selectedNodes.length
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1]
    let selectionAtEnd: RangeSelection
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select()
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index)
    }
    selectionAtEnd.insertNodes(nodes)
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove()
    }
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes
    if (cachedNodes !== null) {
      return cachedNodes
    }
    const objects = this._nodes
    const nodes = []
    for (const object of objects) {
      const node = $getNodeByKey(object)
      if (node !== null) {
        nodes.push(node)
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes
    }
    return nodes
  }

  getTextContent(): string {
    const nodes = this.getNodes()
    let textContent = ''
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent()
    }
    return textContent
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

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes
  }

  /**
   * 주어진 선택 영역이 이 선택 영역과 값으로 동일한지 확인합니다.
   * 앵커, 포커스, 형식, 스타일 속성을 포함합니다.
   *
   * @desc 이 함수는 주어진 선택 영역과 현재 선택 영역을 비교하여,
   * 앵커, 포커스, 형식, 스타일 속성이 모두 동일한지 확인합니다.
   *
   * @param selection - 비교할 선택 영역입니다.
   * @returns 선택 영역이 동일하면 true, 그렇지 않으면 false를 반환합니다.
   */
  is(selection: null | BaseSelection): boolean {
    if (!$isRangeSelection(selection)) {
      return false
    }
    return (
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus) &&
      this.format === selection.format &&
      this.style === selection.style
    )
  }
  /**
   * 선택 영역이 "축소된" 상태인지 여부를 반환합니다.
   * 앵커와 포커스가 동일한 노드에 있고 동일한 오프셋을 가질 때 축소된 상태입니다.
   *
   * @desc 이 함수는 선택 영역의 앵커와 포커스가 동일한 노드에 있고 동일한 오프셋을 가지는지 확인하여,
   * 선택 영역이 축소된 상태인지 여부를 반환합니다.
   *
   * @returns 선택 영역이 축소된 상태이면 true, 그렇지 않으면 false를 반환합니다.
   */
  isCollapsed(): boolean {
    return this.anchor.is(this.focus)
  }
  /**
   * 선택 영역 내의 모든 노드를 가져옵니다. 일반적으로 핫 패스에서 사용하기 적합하도록 캐싱을 사용합니다.
   *
   * @desc 이 함수는 선택 영역 내의 모든 노드를 배열로 반환합니다.
   * 캐싱을 사용하여 성능을 최적화하며, 선택 영역의 앵커와 포커스 지점을 기준으로
   * 시작 노드와 종료 노드를 결정하고 그 사이의 모든 노드를 포함합니다.
   *
   * @returns 선택 영역 내의 모든 노드를 포함하는 배열을 반환합니다.
   */
  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes
    if (cachedNodes !== null) {
      return cachedNodes
    }
    const anchor = this.anchor
    const focus = this.focus
    const isBefore = anchor.isBefore(focus)
    const firstPoint = isBefore ? anchor : focus
    const lastPoint = isBefore ? focus : anchor
    let firstNode = firstPoint.getNode()
    let lastNode = lastPoint.getNode()
    const startOffset = firstPoint.offset
    const endOffset = lastPoint.offset

    if ($isElementNode(firstNode)) {
      const firstNodeDescendant =
        firstNode.getDescendantByIndex<ElementNode>(startOffset)
      firstNode = firstNodeDescendant != null ? firstNodeDescendant : firstNode
    }
    if ($isElementNode(lastNode)) {
      let lastNodeDescendant =
        lastNode.getDescendantByIndex<ElementNode>(endOffset)
      // We don't want to over-select, as node selection infers the child before
      // the last descendant, not including that descendant.
      if (
        lastNodeDescendant !== null &&
        lastNodeDescendant !== firstNode &&
        lastNode.getChildAtIndex(endOffset) === lastNodeDescendant
      ) {
        lastNodeDescendant = lastNodeDescendant.getPreviousSibling()
      }
      lastNode = lastNodeDescendant != null ? lastNodeDescendant : lastNode
    }

    let nodes: Array<LexicalNode>

    if (firstNode.is(lastNode)) {
      if ($isElementNode(firstNode) && firstNode.getChildrenSize() > 0) {
        nodes = []
      } else {
        nodes = [firstNode]
      }
    } else {
      nodes = firstNode.getNodesBetween(lastNode)
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes
    }
    return nodes
  }
  /**
   * 이 선택 영역을 제공된 앵커 및 포커스 값으로 "텍스트" 유형으로 설정합니다.
   *
   * @desc 이 함수는 선택 영역의 앵커 및 포커스 값을 제공된 텍스트 노드와 오프셋으로 설정합니다.
   * 선택 영역의 노드 캐시를 무효화하고, 선택 영역을 더러운 상태로 표시합니다.
   *
   * @param anchorNode - 선택 영역에 설정할 앵커 노드입니다.
   * @param anchorOffset - 선택 영역에 설정할 앵커 오프셋입니다.
   * @param focusNode - 선택 영역에 설정할 포커스 노드입니다.
   * @param focusOffset - 선택 영역에 설정할 포커스 오프셋입니다.
   */
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    $setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'text')
    $setPointValues(this.focus, focusNode.__key, focusOffset, 'text')
    this._cachedNodes = null
    this.dirty = true
  }
  /**
   * 선택 영역 내의 모든 노드의 (일반) 텍스트 콘텐츠를 가져옵니다.
   *
   * @desc 이 함수는 선택 영역 내의 모든 노드의 텍스트 콘텐츠를 문자열로 반환합니다.
   * 선택 영역의 앵커와 포커스 지점을 기반으로 텍스트 콘텐츠를 적절하게 분리하여 반환합니다.
   * 노드 간의 줄 바꿈과 데코레이터 노드 및 줄 바꿈 노드의 텍스트 콘텐츠도 포함됩니다.
   *
   * @returns 선택 영역 내의 모든 노드의 텍스트 콘텐츠를 나타내는 문자열을 반환합니다.
   */
  getTextContent(): string {
    const nodes = this.getNodes()
    if (nodes.length === 0) {
      return ''
    }
    const firstNode = nodes[0]
    const lastNode = nodes[nodes.length - 1]
    const anchor = this.anchor
    const focus = this.focus
    const isBefore = anchor.isBefore(focus)
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this)
    let textContent = ''
    let prevWasElement = true
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n'
        }
        if (node.isEmpty()) {
          prevWasElement = false
        } else {
          prevWasElement = true
        }
      } else {
        prevWasElement = false
        if ($isTextNode(node)) {
          let text = node.getTextContent()
          if (node === firstNode) {
            if (node === lastNode) {
              if (
                anchor.type !== 'element' ||
                focus.type !== 'element' ||
                focus.offset === anchor.offset
              ) {
                text =
                  anchorOffset < focusOffset
                    ? text.slice(anchorOffset, focusOffset)
                    : text.slice(focusOffset, anchorOffset)
              }
            } else {
              text = isBefore
                ? text.slice(anchorOffset)
                : text.slice(focusOffset)
            }
          } else if (node === lastNode) {
            text = isBefore
              ? text.slice(0, focusOffset)
              : text.slice(0, anchorOffset)
          }
          textContent += text
        } else if (
          ($isDecoratorNode(node) || $isLineBreakNode(node)) &&
          (node !== lastNode || !this.isCollapsed())
        ) {
          textContent += node.getTextContent()
        }
      }
    }
    return textContent
  }
  /**
   * 이 Lexical Selection에 DOM 선택 범위를 매핑하려고 시도하여
   * 앵커, 포커스 및 유형을 설정합니다.
   *
   * @desc 이 함수는 DOM 선택 범위를 받아서 해당 범위를 Lexical Selection에 매핑합니다.
   * 이를 통해 앵커, 포커스 및 선택 유형을 설정합니다. 주어진 DOM 선택 범위의 시작 및 끝 지점을
   * Lexical Selection의 앵커와 포커스 지점으로 설정합니다.
   *
   * @param range - StaticRange 인터페이스를 준수하는 DOM 선택 범위입니다.
   */
  applyDOMRange(range: StaticRange): void {
    const editor = getActiveEditor()
    const currentEditorState = editor.getEditorState()
    const lastSelection = currentEditorState._selection
    const resolvedSelectionPoints = $internalResolveSelectionPoints(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
      lastSelection,
    )
    if (resolvedSelectionPoints === null) {
      return
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints
    $setPointValues(
      this.anchor,
      anchorPoint.key,
      anchorPoint.offset,
      anchorPoint.type,
    )
    $setPointValues(
      this.focus,
      focusPoint.key,
      focusPoint.offset,
      focusPoint.type,
    )
    this._cachedNodes = null
  }
  /**
   * 이 RangeSelection의 모든 속성 값을 복사하여 새로운 RangeSelection을 생성합니다.
   *
   * @desc 이 함수는 현재 RangeSelection의 앵커, 포커스, 형식, 스타일 등의 모든 속성 값을 복사하여
   * 새로운 RangeSelection을 생성합니다. 새로 생성된 RangeSelection은 현재 선택 영역과 동일한
   * 속성 값을 가집니다.
   *
   * @returns 이 RangeSelection과 동일한 속성 값을 가진 새로운 RangeSelection을 반환합니다.
   */
  clone(): RangeSelection {
    const anchor = this.anchor
    const focus = this.focus
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
      this.style,
    )
    return selection
  }
  /**
   * 선택 영역의 모든 TextNodes에서 제공된 형식을 토글합니다.
   *
   * @desc 이 함수는 선택 영역 내의 모든 TextNode에서 제공된 형식을 토글합니다.
   * 현재 선택된 텍스트 형식을 업데이트하고, 선택 영역을 더러운 상태로 표시합니다.
   *
   * @param format - 선택 영역 내의 TextNode에서 토글할 문자열 형식(TextFormatType)입니다.
   */
  toggleFormat(format: TextFormatType): void {
    this.format = toggleTextFormatType(this.format, format, null)
    this.dirty = true
  }
  /**
   * 선택 영역의 스타일 속성 값을 설정합니다.
   *
   * @desc 이 함수는 선택 영역의 스타일 속성 값을 제공된 스타일 값으로 설정합니다.
   * 스타일이 업데이트되면 선택 영역을 더러운 상태로 표시합니다.
   *
   * @param style - 스타일 속성에 설정할 스타일 값입니다.
   */
  setStyle(style: string): void {
    this.style = style
    this.dirty = true
  }
  /**
   * 선택 영역에 제공된 TextFormatType이 존재하는지 여부를 반환합니다.
   * 선택 영역 내의 어떤 노드라도 지정된 형식을 가지고 있으면 true를 반환합니다.
   *
   * @desc 이 함수는 선택 영역에 제공된 TextFormatType이 존재하는지 확인하여,
   * 선택 영역 내의 어떤 노드라도 지정된 형식을 가지고 있으면 true를 반환합니다.
   *
   * @param type - 확인할 TextFormatType입니다.
   * @returns 제공된 형식이 현재 선택 영역에 토글되어 있으면 true, 그렇지 않으면 false를 반환합니다.
   */
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type]
    return (this.format & formatFlag) !== 0
  }
  /**
   * 제공된 텍스트를 현재 선택 영역에 있는 EditorState에 삽입하려고 시도합니다.
   * 탭, 개행 및 캐리지 리턴을 LexicalNodes로 변환합니다.
   *
   * @desc 이 함수는 주어진 텍스트를 탭, 개행 및 캐리지 리턴으로 분할하고,
   * 이를 적절한 LexicalNodes로 변환하여 선택 영역에 삽입합니다.
   *
   * @param text - 선택 영역에 삽입할 텍스트입니다.
   */
  insertRawText(text: string): void {
    const parts = text.split(/(\r?\n|\t)/)
    const nodes = []
    const length = parts.length
    for (let i = 0; i < length; i++) {
      const part = parts[i]
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode())
      } else if (part === '\t') {
        nodes.push($createTabNode())
      } else {
        nodes.push($createTextNode(part))
      }
    }
    this.insertNodes(nodes)
  }
  /**
   * 제공된 텍스트를 현재 선택 영역에 있는 EditorState에 새로운 Lexical TextNode로 삽입하려고 시도합니다.
   * 선택 유형 및 위치에 따라 일련의 삽입 휴리스틱을 기반으로 텍스트를 삽입합니다.
   *
   * @desc 이 함수는 제공된 텍스트를 현재 선택 영역에 삽입하려고 시도합니다.
   * 텍스트는 선택 유형과 위치에 따라 적절한 Lexical TextNode로 변환됩니다.
   * 선택 영역이 텍스트 노드인 경우, 텍스트를 직접 삽입하고,
   * 그렇지 않은 경우, 적절한 위치에 새로운 텍스트 노드를 생성하여 삽입합니다.
   *
   * @param text - 선택 영역에 삽입할 텍스트입니다.
   */
  insertText(text: string): void {
    const anchor = this.anchor
    const focus = this.focus
    const format = this.format
    const style = this.style
    let firstPoint = anchor
    let endPoint = focus
    if (!this.isCollapsed() && focus.isBefore(anchor)) {
      firstPoint = focus
      endPoint = anchor
    }
    if (firstPoint.type === 'element') {
      $transferStartingElementPointToTextPoint(
        firstPoint,
        endPoint,
        format,
        style,
      )
    }
    const startOffset = firstPoint.offset
    let endOffset = endPoint.offset
    const selectedNodes = this.getNodes()
    const selectedNodesLength = selectedNodes.length
    let firstNode: TextNode = selectedNodes[0] as TextNode

    if (!$isTextNode(firstNode)) {
      invariant(false, 'insertText: first node is not a text node')
    }
    const firstNodeText = firstNode.getTextContent()
    const firstNodeTextLength = firstNodeText.length
    const firstNodeParent = firstNode.getParentOrThrow()
    const lastIndex = selectedNodesLength - 1
    let lastNode = selectedNodes[lastIndex]

    if (selectedNodesLength === 1 && endPoint.type === 'element') {
      endOffset = firstNodeTextLength
      endPoint.set(firstPoint.key, endOffset, 'text')
    }

    if (
      this.isCollapsed() &&
      startOffset === firstNodeTextLength &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextAfter() ||
        (!firstNodeParent.canInsertTextAfter() &&
          firstNode.getNextSibling() === null))
    ) {
      let nextSibling = firstNode.getNextSibling<TextNode>()
      if (
        !$isTextNode(nextSibling) ||
        !nextSibling.canInsertTextBefore() ||
        $isTokenOrSegmented(nextSibling)
      ) {
        nextSibling = $createTextNode()
        nextSibling.setFormat(format)
        nextSibling.setStyle(style)
        if (!firstNodeParent.canInsertTextAfter()) {
          firstNodeParent.insertAfter(nextSibling)
        } else {
          firstNode.insertAfter(nextSibling)
        }
      }
      nextSibling.select(0, 0)
      firstNode = nextSibling
      if (text !== '') {
        this.insertText(text)
        return
      }
    } else if (
      this.isCollapsed() &&
      startOffset === 0 &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextBefore() ||
        (!firstNodeParent.canInsertTextBefore() &&
          firstNode.getPreviousSibling() === null))
    ) {
      let prevSibling = firstNode.getPreviousSibling<TextNode>()
      if (!$isTextNode(prevSibling) || $isTokenOrSegmented(prevSibling)) {
        prevSibling = $createTextNode()
        prevSibling.setFormat(format)
        if (!firstNodeParent.canInsertTextBefore()) {
          firstNodeParent.insertBefore(prevSibling)
        } else {
          firstNode.insertBefore(prevSibling)
        }
      }
      prevSibling.select()
      firstNode = prevSibling
      if (text !== '') {
        this.insertText(text)
        return
      }
    } else if (firstNode.isSegmented() && startOffset !== firstNodeTextLength) {
      const textNode = $createTextNode(firstNode.getTextContent())
      textNode.setFormat(format)
      firstNode.replace(textNode)
      firstNode = textNode
    } else if (!this.isCollapsed() && text !== '') {
      // When the firstNode or lastNode parents are elements that
      // do not allow text to be inserted before or after, we first
      // clear the content. Then we normalize selection, then insert
      // the new content.
      const lastNodeParent = lastNode.getParent()

      if (
        !firstNodeParent.canInsertTextBefore() ||
        !firstNodeParent.canInsertTextAfter() ||
        ($isElementNode(lastNodeParent) &&
          (!lastNodeParent.canInsertTextBefore() ||
            !lastNodeParent.canInsertTextAfter()))
      ) {
        this.insertText('')
        $normalizeSelectionPointsForBoundaries(this.anchor, this.focus, null)
        this.insertText(text)
        return
      }
    }

    if (selectedNodesLength === 1) {
      if (firstNode.isToken()) {
        const textNode = $createTextNode(text)
        textNode.select()
        firstNode.replace(textNode)
        return
      }
      const firstNodeFormat = firstNode.getFormat()
      const firstNodeStyle = firstNode.getStyle()

      if (
        startOffset === endOffset &&
        (firstNodeFormat !== format || firstNodeStyle !== style)
      ) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format)
          firstNode.setStyle(style)
        } else {
          const textNode = $createTextNode(text)
          textNode.setFormat(format)
          textNode.setStyle(style)
          textNode.select()
          if (startOffset === 0) {
            firstNode.insertBefore(textNode, false)
          } else {
            const [targetNode] = firstNode.splitText(startOffset)
            targetNode.insertAfter(textNode, false)
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length
          }
          return
        }
      } else if ($isTabNode(firstNode)) {
        // We don't need to check for delCount because there is only the entire selected node case
        // that can hit here for content size 1 and with canInsertTextBeforeAfter false
        const textNode = $createTextNode(text)
        textNode.setFormat(format)
        textNode.setStyle(style)
        textNode.select()
        firstNode.replace(textNode)
        return
      }
      const delCount = endOffset - startOffset

      firstNode = firstNode.spliceText(startOffset, delCount, text, true)
      if (firstNode.getTextContent() === '') {
        firstNode.remove()
      } else if (this.anchor.type === 'text') {
        if (firstNode.isComposing()) {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length
        } else {
          this.format = firstNodeFormat
          this.style = firstNodeStyle
        }
      }
    } else {
      const markedNodeKeysForKeep = new Set([
        ...firstNode.getParentKeys(),
        ...lastNode.getParentKeys(),
      ])

      // We have to get the parent elements before the next section,
      // as in that section we might mutate the lastNode.
      const firstElement = $isElementNode(firstNode)
        ? firstNode
        : firstNode.getParentOrThrow()
      let lastElement = $isElementNode(lastNode)
        ? lastNode
        : lastNode.getParentOrThrow()
      let lastElementChild = lastNode

      // If the last element is inline, we should instead look at getting
      // the nodes of its parent, rather than itself. This behavior will
      // then better match how text node insertions work. We will need to
      // also update the last element's child accordingly as we do this.
      if (!firstElement.is(lastElement) && lastElement.isInline()) {
        // Keep traversing till we have a non-inline element parent.
        do {
          lastElementChild = lastElement
          lastElement = lastElement.getParentOrThrow()
        } while (lastElement.isInline())
      }

      // Handle mutations to the last node.
      if (
        (endPoint.type === 'text' &&
          (endOffset !== 0 || lastNode.getTextContent() === '')) ||
        (endPoint.type === 'element' &&
          lastNode.getIndexWithinParent() < endOffset)
      ) {
        if (
          $isTextNode(lastNode) &&
          !lastNode.isToken() &&
          endOffset !== lastNode.getTextContentSize()
        ) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent())
            lastNode.replace(textNode)
            lastNode = textNode
          }
          // root node selections only select whole nodes, so no text splice is necessary
          if (!$isRootNode(endPoint.getNode()) && endPoint.type === 'text') {
            lastNode = (lastNode as TextNode).spliceText(0, endOffset, '')
          }
          markedNodeKeysForKeep.add(lastNode.__key)
        } else {
          const lastNodeParent = lastNode.getParentOrThrow()
          if (
            !lastNodeParent.canBeEmpty() &&
            lastNodeParent.getChildrenSize() === 1
          ) {
            lastNodeParent.remove()
          } else {
            lastNode.remove()
          }
        }
      } else {
        markedNodeKeysForKeep.add(lastNode.__key)
      }

      // Either move the remaining nodes of the last parent to after
      // the first child, or remove them entirely. If the last parent
      // is the same as the first parent, this logic also works.
      const lastNodeChildren = lastElement.getChildren()
      const selectedNodesSet = new Set(selectedNodes)
      const firstAndLastElementsAreEqual = firstElement.is(lastElement)

      // We choose a target to insert all nodes after. In the case of having
      // and inline starting parent element with a starting node that has no
      // siblings, we should insert after the starting parent element, otherwise
      // we will incorrectly merge into the starting parent element.
      // TODO: should we keep on traversing parents if we're inside another
      // nested inline element?
      const insertionTarget =
        firstElement.isInline() && firstNode.getNextSibling() === null
          ? firstElement
          : firstNode

      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i]

        if (
          lastNodeChild.is(firstNode) ||
          ($isElementNode(lastNodeChild) && lastNodeChild.isParentOf(firstNode))
        ) {
          break
        }

        if (lastNodeChild.isAttached()) {
          if (
            !selectedNodesSet.has(lastNodeChild) ||
            lastNodeChild.is(lastElementChild)
          ) {
            if (!firstAndLastElementsAreEqual) {
              insertionTarget.insertAfter(lastNodeChild, false)
            }
          } else {
            lastNodeChild.remove()
          }
        }
      }

      if (!firstAndLastElementsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent: ElementNode | null = lastElement
        let lastRemovedParent = null

        while (parent !== null) {
          const children = parent.getChildren()
          const childrenLength = children.length
          if (
            childrenLength === 0 ||
            children[childrenLength - 1].is(lastRemovedParent)
          ) {
            markedNodeKeysForKeep.delete(parent.__key)
            lastRemovedParent = parent
          }
          parent = parent.getParent()
        }
      }

      // Ensure we do splicing after moving of nodes, as splicing
      // can have side-effects (in the case of hashtags).
      if (!firstNode.isToken()) {
        firstNode = firstNode.spliceText(
          startOffset,
          firstNodeTextLength - startOffset,
          text,
          true,
        )
        if (firstNode.getTextContent() === '') {
          firstNode.remove()
        } else if (firstNode.isComposing() && this.anchor.type === 'text') {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length
        }
      } else if (startOffset === firstNodeTextLength) {
        firstNode.select()
      } else {
        const textNode = $createTextNode(text)
        textNode.select()
        firstNode.replace(textNode)
      }

      // Remove all selected nodes that haven't already been removed.
      for (let i = 1; i < selectedNodesLength; i++) {
        const selectedNode = selectedNodes[i]
        const key = selectedNode.__key
        if (!markedNodeKeysForKeep.has(key)) {
          selectedNode.remove()
        }
      }
    }
  }
  /**
   * 선택 영역의 텍스트를 제거하여 EditorState를 조정합니다.
   *
   * @desc 이 메서드는 선택된 텍스트를 빈 문자열로 대체하여 제거합니다.
   * 실제로는 insertText 메서드를 빈 문자열로 호출하여 선택된 영역의 텍스트를 삭제합니다.
   */
  removeText(): void {
    this.insertText('')
  }
  /**
   *  선택된 텍스트 노드에 지정된 포맷을 적용합니다. 필요한 경우 노드를 분할하거나 병합합니다.
   *
   * @desc 이 메서드는 선택 영역의 텍스트 노드에 지정된 포맷을 적용합니다.
   * 선택된 텍스트 노드가 여러 개일 경우 필요한 경우 노드를 분할하거나 병합하여 포맷을 적용합니다.
   * 선택이 텍스트 노드 내부에 걸쳐 있을 경우, 해당 부분을 새로운 텍스트 노드로 분할한 후 포맷을 적용합니다.
   * 선택이 요소 노드에 걸쳐 있을 경우, 선택을 텍스트 노드로 전환하여 포맷을 적용합니다.
   *
   * @param formatType - 선택 영역의 텍스트 노드에 적용할 포맷 유형입니다.
   */
  formatText(formatType: TextFormatType): void {
    if (this.isCollapsed()) {
      this.toggleFormat(formatType)
      // 포맷을 변경할 때는 composition을 중단해야 합니다.
      $setCompositionKey(null)
      return
    }

    const selectedNodes = this.getNodes()
    const selectedTextNodes: Array<TextNode> = []
    for (const selectedNode of selectedNodes) {
      if ($isTextNode(selectedNode)) {
        selectedTextNodes.push(selectedNode)
      }
    }

    const selectedTextNodesLength = selectedTextNodes.length
    if (selectedTextNodesLength === 0) {
      this.toggleFormat(formatType)
      // 포맷을 변경할 때는 composition을 중단해야 합니다.
      $setCompositionKey(null)
      return
    }

    const anchor = this.anchor
    const focus = this.focus
    const isBackward = this.isBackward()
    const startPoint = isBackward ? focus : anchor
    const endPoint = isBackward ? anchor : focus

    let firstIndex = 0
    let firstNode = selectedTextNodes[0]
    let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset

    // 선택이 텍스트 노드 끝에서 시작된 경우 다음 텍스트 노드를 사용합니다.
    if (
      startPoint.type === 'text' &&
      startOffset === firstNode.getTextContentSize()
    ) {
      firstIndex = 1
      firstNode = selectedTextNodes[1]
      startOffset = 0
    }

    if (firstNode == null) {
      return
    }

    const firstNextFormat = firstNode.getFormatFlags(formatType, null)

    const lastIndex = selectedTextNodesLength - 1
    let lastNode = selectedTextNodes[lastIndex]
    const endOffset =
      endPoint.type === 'text' ? endPoint.offset : lastNode.getTextContentSize()

    // 단일 노드가 선택된 경우
    if (firstNode.is(lastNode)) {
      // 실제 텍스트가 선택되지 않은 경우 아무것도 하지 않습니다.
      if (startOffset === endOffset) {
        return
      }
      // 전체 노드가 선택되었거나 토큰인 경우 포맷만 적용합니다.
      if (
        $isTokenOrSegmented(firstNode) ||
        (startOffset === 0 && endOffset === firstNode.getTextContentSize())
      ) {
        firstNode.setFormat(firstNextFormat)
      } else {
        // 노드가 부분적으로 선택된 경우 노드를 두 개로 분할하고 선택된 부분에 포맷을 추가합니다.
        const splitNodes = firstNode.splitText(startOffset, endOffset)
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1]
        replacement.setFormat(firstNextFormat)

        // 시작/끝이 텍스트 노드인 경우 선택을 업데이트합니다.
        if (startPoint.type === 'text') {
          startPoint.set(replacement.__key, 0, 'text')
        }
        if (endPoint.type === 'text') {
          endPoint.set(replacement.__key, endOffset - startOffset, 'text')
        }
      }

      this.format = firstNextFormat

      return
    }
    // 여러 노드가 선택된 경우
    // 첫 번째 노드 전체가 선택되지 않은 경우 분할합니다.
    if (startOffset !== 0 && !$isTokenOrSegmented(firstNode)) {
      ;[, firstNode as TextNode] = firstNode.splitText(startOffset)
      startOffset = 0
    }
    firstNode.setFormat(firstNextFormat)

    const lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat)
    // 오프셋이 0인 경우 실제로 선택된 문자가 없으므로 마지막 노드를 포맷하지 않습니다.
    if (endOffset > 0) {
      if (
        endOffset !== lastNode.getTextContentSize() &&
        !$isTokenOrSegmented(lastNode)
      ) {
        ;[lastNode as TextNode] = lastNode.splitText(endOffset)
      }
      lastNode.setFormat(lastNextFormat)
    }

    // 중간에 있는 모든 텍스트 노드를 처리합니다.
    for (let i = firstIndex + 1; i < lastIndex; i++) {
      const textNode = selectedTextNodes[i]
      const nextFormat = textNode.getFormatFlags(formatType, lastNextFormat)
      textNode.setFormat(nextFormat)
    }

    // 시작/끝이 텍스트 노드인 경우 선택을 업데이트합니다.
    if (startPoint.type === 'text') {
      startPoint.set(firstNode.__key, startOffset, 'text')
    }
    if (endPoint.type === 'text') {
      endPoint.set(lastNode.__key, endOffset, 'text')
    }

    this.format = firstNextFormat | lastNextFormat
  }
  /**
   * 주어진 Lexical 노드 배열을 현재 선택 영역에 "지능적으로" 삽입하려고 시도합니다.
   * 주변 노드가 들어오는 노드를 수용하기 위해 어떻게 변경, 교체 또는 이동되어야 하는지에 대한 일련의 휴리스틱에 따라 수행됩니다.
   *
   * @desc 이 메서드는 Lexical 에디터에서 선택된 영역에 주어진 노드 배열을 삽입하려고 시도합니다. 주변 노드의 변경, 교체 또는 이동을 처리하기 위해 다양한 시나리오를 고려하여 작동합니다. 예를 들어, 코드 블록 내에서의 삽입, 인라인 노드 배열의 삽입, 블록 노드가 포함된 배열의 삽입 등을 처리합니다. 각 경우에 따라 선택된 노드를 적절히 처리하고 삽입된 노드와 주변 노드의 형식을 유지합니다.
   *
   * @param nodes - 삽입할 노드 배열입니다.
   */
  insertNodes(nodes: Array<LexicalNode>): void {
    if (nodes.length === 0) {
      return
    }
    if (this.anchor.key === 'root') {
      this.insertParagraph()
      const selection = $getSelection()
      invariant(
        $isRangeSelection(selection),
        'Expected RangeSelection after insertParagraph',
      )
      return selection.insertNodes(nodes)
    }

    const firstPoint = this.isBackward() ? this.focus : this.anchor
    const firstBlock = $getAncestor(firstPoint.getNode(), INTERNAL_$isBlock)!

    const last = nodes[nodes.length - 1]!

    // CASE 1: 코드 블록 내부에 삽입하는 경우
    if ('__language' in firstBlock && $isElementNode(firstBlock)) {
      if ('__language' in nodes[0]) {
        this.insertText(nodes[0].getTextContent())
      } else {
        const index = $removeTextAndSplitBlock(this)
        firstBlock.splice(index, 0, nodes)
        last.selectEnd()
      }
      return
    }

    // CASE 2: 배열의 모든 요소가 인라인인 경우
    const notInline = (node: LexicalNode) =>
      ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline()

    if (!nodes.some(notInline)) {
      invariant(
        $isElementNode(firstBlock),
        "Expected 'firstBlock' to be an ElementNode",
      )
      const index = $removeTextAndSplitBlock(this)
      firstBlock.splice(index, 0, nodes)
      last.selectEnd()
      return
    }

    // CASE 3: 배열에 최소한 하나의 블록 요소가 포함된 경우
    const blocksParent = $wrapInlineNodes(nodes)
    const nodeToSelect = blocksParent.getLastDescendant()!
    const blocks = blocksParent.getChildren()
    const isLI = (node: LexicalNode) => '__value' in node && '__checked' in node
    const isMergeable = (node: LexicalNode): node is ElementNode =>
      $isElementNode(node) &&
      INTERNAL_$isBlock(node) &&
      !node.isEmpty() &&
      $isElementNode(firstBlock) &&
      (!firstBlock.isEmpty() || isLI(firstBlock))

    const shouldInsert = !$isElementNode(firstBlock) || !firstBlock.isEmpty()
    const insertedParagraph = shouldInsert ? this.insertParagraph() : null
    const lastToInsert = blocks[blocks.length - 1]
    let firstToInsert = blocks[0]
    if (isMergeable(firstToInsert)) {
      invariant(
        $isElementNode(firstBlock),
        "Expected 'firstBlock' to be an ElementNode",
      )
      firstBlock.append(...firstToInsert.getChildren())
      firstToInsert = blocks[1]
    }
    if (firstToInsert) {
      insertRangeAfter(firstBlock, firstToInsert)
    }
    const lastInsertedBlock = $getAncestor(nodeToSelect, INTERNAL_$isBlock)!

    if (
      insertedParagraph &&
      $isElementNode(lastInsertedBlock) &&
      (isLI(insertedParagraph) || INTERNAL_$isBlock(lastToInsert))
    ) {
      lastInsertedBlock.append(...insertedParagraph.getChildren())
      insertedParagraph.remove()
    }
    if ($isElementNode(firstBlock) && firstBlock.isEmpty()) {
      firstBlock.remove()
    }

    nodeToSelect.selectEnd()

    // 다음 테스트 케이스를 이해하려면 "can wrap post-linebreak nodes into new element" 테스트를 참조하십시오.
    const lastChild = $isElementNode(firstBlock)
      ? firstBlock.getLastChild()
      : null
    if ($isLineBreakNode(lastChild) && lastInsertedBlock !== firstBlock) {
      lastChild.remove()
    }
  }
  /**
   * 현재 선택 영역에 새 ParagraphNode를 삽입합니다.
   *
   * @desc 이 메서드는 현재 선택 영역에 새 ParagraphNode를 삽입합니다. 선택된 위치가 루트일 경우 새 ParagraphNode를 루트의 특정 위치에 삽입합니다. 그렇지 않은 경우 텍스트를 제거하고 블록을 분할한 후 새 ParagraphNode를 삽입합니다.
   *
   * @returns 새로 삽입된 노드입니다.
   */
  insertParagraph(): ElementNode | null {
    if (this.anchor.key === 'root') {
      const paragraph = $createParagraphNode()
      $getRoot().splice(this.anchor.offset, 0, [paragraph])
      paragraph.select()
      return paragraph
    }
    const index = $removeTextAndSplitBlock(this)
    const block = $getAncestor(this.anchor.getNode(), INTERNAL_$isBlock)!
    invariant($isElementNode(block), 'Expected ancestor to be an ElementNode')
    const firstToAppend = block.getChildAtIndex(index)
    const nodesToInsert = firstToAppend
      ? [firstToAppend, ...firstToAppend.getNextSiblings()]
      : []
    const newBlock = block.insertNewAfter(this, false) as ElementNode | null
    if (newBlock) {
      newBlock.append(...nodesToInsert)
      newBlock.selectStart()
      return newBlock
    }
    // if newBlock is null, it means that block is of type CodeNode.
    return null
  }
  /**
   * 현재 선택 영역에 논리적 줄바꿈을 삽입합니다. 이 줄바꿈은 새 LineBreakNode 또는 새 ParagraphNode가 될 수 있습니다.
   *
   * @desc 이 메서드는 현재 선택된 위치에 논리적 줄바꿈을 삽입합니다. 기본적으로 LineBreakNode를 생성하여 삽입하며, 특정 상황에서는 선택 영역을 줄바꿈 노드의 시작 부분으로 설정할 수 있습니다.
   * @param selectStart - 줄바꿈 후 선택 영역을 줄바꿈 노드의 시작 부분으로 설정할지 여부를 결정합니다.
   */
  insertLineBreak(selectStart?: boolean): void {
    const lineBreak = $createLineBreakNode()
    this.insertNodes([lineBreak])
    // 이 코드는 MacOS에서 'ctrl-O' 명령어(openLineBreak)와 함께 사용됩니다.
    if (selectStart) {
      const parent = lineBreak.getParentOrThrow()
      const index = lineBreak.getIndexWithinParent()
      parent.select(index, index)
    }
  }
  /**
   * 선택 영역 내의 노드를 추출하여 필요한 경우 오프셋 수준의 정밀도로 노드를 분할합니다.
   *
   * @desc 이 메서드는 선택 영역에 있는 노드를 추출하며, 필요한 경우 텍스트 노드를 분할하여 시작 및 종료 오프셋으로 선택된 부분만을 반환합니다. 여러 개의 노드가 선택된 경우, 첫 번째 및 마지막 노드에서 오프셋을 기준으로 분할하여 선택된 부분만을 추출합니다.
   * @returns 선택 영역 내의 노드 배열을 반환합니다.
   */

  extract(): Array<LexicalNode> {
    const selectedNodes = this.getNodes()
    const selectedNodesLength = selectedNodes.length
    const lastIndex = selectedNodesLength - 1
    const anchor = this.anchor
    const focus = this.focus
    let firstNode = selectedNodes[0]
    let lastNode = selectedNodes[lastIndex]
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this)

    if (selectedNodesLength === 0) {
      return []
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const startOffset =
          anchorOffset > focusOffset ? focusOffset : anchorOffset
        const endOffset =
          anchorOffset > focusOffset ? anchorOffset : focusOffset
        const splitNodes = firstNode.splitText(startOffset, endOffset)
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1]
        return node != null ? [node] : []
      }
      return [firstNode]
    }
    const isBefore = anchor.isBefore(focus)

    if ($isTextNode(firstNode)) {
      const startOffset = isBefore ? anchorOffset : focusOffset
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift()
      } else if (startOffset !== 0) {
        ;[, firstNode] = firstNode.splitText(startOffset)
        selectedNodes[0] = firstNode
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent()
      const lastNodeTextLength = lastNodeText.length
      const endOffset = isBefore ? focusOffset : anchorOffset
      if (endOffset === 0) {
        selectedNodes.pop()
      } else if (endOffset !== lastNodeTextLength) {
        ;[lastNode] = lastNode.splitText(endOffset)
        selectedNodes[lastIndex] = lastNode
      }
    }
    return selectedNodes
  }
  /**
   * 선택 영역을 다양한 노드 타입에 따라 수정합니다. 하나의 논리적 "단위"를 기준으로
   * 선택 영역을 안전하게 이동하거나 확장하는 데 사용됩니다.
   *
   * @desc 이 메서드는 선택 영역을 이동하거나 확장하는 작업을 수행합니다. 선택 영역을 "move"로 설정하면 선택 영역을 축소하고, "extend"로 설정하면 선택 영역을 확장합니다. 이 과정에서 다양한 노드 타입을 고려하여 적절한 위치로 선택 영역을 설정합니다.
   * @param alter 선택 영역을 수정할 유형 ('move' 또는 'extend')
   * @param isBackward 선택 영역이 뒤로 이동하는지 여부
   * @param granularity 선택 영역을 수정할 세부 단위 ('character', 'word', 'lineboundary')
   */
  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void {
    const focus = this.focus
    const anchor = this.anchor
    const collapse = alter === 'move'

    // Decorator 주변에서의 선택 영역 이동 처리
    const possibleNode = $getAdjacentNode(focus, isBackward)
    if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
      // 선택 영역을 범위 선택에서 노드 선택으로 이동할 수 있게 합니다.
      if (collapse && possibleNode.isKeyboardSelectable()) {
        const nodeSelection = $createNodeSelection()
        nodeSelection.add(possibleNode.__key)
        $setSelection(nodeSelection)
        return
      }
      const sibling = isBackward
        ? possibleNode.getPreviousSibling()
        : possibleNode.getNextSibling()

      if (!$isTextNode(sibling)) {
        const parent = possibleNode.getParentOrThrow()
        let offset
        let elementKey

        if ($isElementNode(sibling)) {
          elementKey = sibling.__key
          offset = isBackward ? sibling.getChildrenSize() : 0
        } else {
          offset = possibleNode.getIndexWithinParent()
          elementKey = parent.__key
          if (!isBackward) {
            offset++
          }
        }
        focus.set(elementKey, offset, 'element')
        if (collapse) {
          anchor.set(elementKey, offset, 'element')
        }
        return
      } else {
        const siblingKey = sibling.__key
        const offset = isBackward ? sibling.getTextContent().length : 0
        focus.set(siblingKey, offset, 'text')
        if (collapse) {
          anchor.set(siblingKey, offset, 'text')
        }
        return
      }
    }
    const editor = getActiveEditor()
    const domSelection = getDOMSelection(editor._window)

    if (!domSelection) {
      return
    }
    const blockCursorElement = editor._blockCursorElement
    const rootElement = editor._rootElement
    // 블록 커서 요소가 존재하는 경우 제거합니다. 이를 통해 선택 영역이 올바르게 작동하도록 합니다.
    if (
      rootElement !== null &&
      blockCursorElement !== null &&
      $isElementNode(possibleNode) &&
      !possibleNode.isInline() &&
      !possibleNode.canBeEmpty()
    ) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement)
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    // DOM selection.modify API를 사용하여 선택 영역을 이동합니다.
    moveNativeSelection(
      domSelection,
      alter,
      isBackward ? 'backward' : 'forward',
      granularity,
    )
    // 범위가 존재하는지 확인합니다.
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0)
      // DOM 선택 영역을 Lexical 선택 영역에 적용합니다.
      const anchorNode = this.anchor.getNode()
      const root = $isRootNode(anchorNode)
        ? anchorNode
        : $getNearestRootOrShadowRoot(anchorNode)
      this.applyDOMRange(range)
      this.dirty = true
      if (!collapse) {
        // Validate selection; make sure that the new extended selection respects shadow roots
        // 선택 영역을 검증하고 유효한 노드만 유지합니다.
        const nodes = this.getNodes()
        const validNodes = []
        let shrinkSelection = false
        for (let i = 0; i < nodes.length; i++) {
          const nextNode = nodes[i]
          if ($hasAncestor(nextNode, root)) {
            validNodes.push(nextNode)
          } else {
            shrinkSelection = true
          }
        }
        if (shrinkSelection && validNodes.length > 0) {
          // validNodes length check is a safeguard against an invalid selection; as getNodes()
          // will return an empty array in this case
          // 유효한 노드가 있는 경우, 선택 영역을 축소합니다.
          if (isBackward) {
            const firstValidNode = validNodes[0]
            if ($isElementNode(firstValidNode)) {
              firstValidNode.selectStart()
            } else {
              firstValidNode.getParentOrThrow().selectStart()
            }
          } else {
            const lastValidNode = validNodes[validNodes.length - 1]
            if ($isElementNode(lastValidNode)) {
              lastValidNode.selectEnd()
            } else {
              lastValidNode.getParentOrThrow().selectEnd()
            }
          }
        }

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically.
        // DOM의 anchor와 focus 포인트를 확인하고, 필요한 경우 교체합니다.
        if (
          domSelection.anchorNode !== range.startContainer ||
          domSelection.anchorOffset !== range.startOffset
        ) {
          $swapPoints(this)
        }
      }
    }
  }
  /**
   * 요소 노드(예: 테이블, 열 레이아웃)가 파괴되지 않도록 방지하는 전방 문자 및 단어 삭제를 처리하는 도우미
   *
   * @desc 이 메서드는 선택 영역이 전방 삭제를 수행할 때 특정 요소 노드가 파괴되지 않도록 도와줍니다. 선택 영역이 요소의 끝에 위치하거나 텍스트 노드의 끝에 위치할 때, 다음 형제 노드가 섀도우 루트인지 확인하여 삭제를 방지합니다.
   * @param anchor 선택 영역의 앵커
   * @param anchorNode 선택 영역의 앵커 노드
   * @param isBackward 선택 영역이 뒤로 이동하는지 여부
   * @returns 요소 노드가 파괴되지 않도록 삭제를 방지해야 하는 경우 true를 반환, 그렇지 않으면 false를 반환
   */
  forwardDeletion(
    anchor: PointType,
    anchorNode: TextNode | ElementNode,
    isBackward: boolean,
  ): boolean {
    if (
      !isBackward &&
      // Delete forward handle case
      ((anchor.type === 'element' &&
        $isElementNode(anchorNode) &&
        anchor.offset === anchorNode.getChildrenSize()) ||
        (anchor.type === 'text' &&
          anchor.offset === anchorNode.getTextContentSize()))
    ) {
      const parent = anchorNode.getParent()
      const nextSibling =
        anchorNode.getNextSibling() ||
        (parent === null ? null : parent.getNextSibling())

      if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
        return true
      }
    }
    return false
  }
  /**
   * 선택 영역을 기준으로 EditorState에서 하나의 논리적 문자 삭제 작업을 수행합니다.
   * 다양한 노드 유형을 처리합니다.
   *
   * @desc 이 메서드는 현재 선택 영역을 기준으로 하나의 문자를 삭제합니다.
   * 텍스트 노드와 요소 노드를 포함한 다양한 노드 유형을 처리하며,
   * 선택 영역이 여러 유형의 노드 경계에 걸쳐 있을 때 이를 적절하게 처리합니다.
   *
   * @param isBackward 선택 영역이 뒤로 이동하는지 여부를 나타냅니다.
   */
  deleteCharacter(isBackward: boolean): void {
    const wasCollapsed = this.isCollapsed()
    if (this.isCollapsed()) {
      const anchor = this.anchor
      let anchorNode: TextNode | ElementNode | null = anchor.getNode()
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return
      }

      // Handle the deletion around decorators.
      const focus = this.focus
      const possibleNode = $getAdjacentNode(focus, isBackward)
      if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
        // Make it possible to move selection from range selection to
        // node selection on the node.
        if (
          possibleNode.isKeyboardSelectable() &&
          $isElementNode(anchorNode) &&
          anchorNode.getChildrenSize() === 0
        ) {
          anchorNode.remove()
          const nodeSelection = $createNodeSelection()
          nodeSelection.add(possibleNode.__key)
          $setSelection(nodeSelection)
        } else {
          possibleNode.remove()
          const editor = getActiveEditor()
          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined)
        }
        return
      } else if (
        !isBackward &&
        $isElementNode(possibleNode) &&
        $isElementNode(anchorNode) &&
        anchorNode.isEmpty()
      ) {
        anchorNode.remove()
        possibleNode.selectStart()
        return
      }
      this.modify('extend', isBackward, 'character')

      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null

        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset
          const textContentSize = focusNode.getTextContentSize()
          if (
            focusNode.is(anchorNode) ||
            (isBackward && offset !== textContentSize) ||
            (!isBackward && offset !== 0)
          ) {
            $removeSegment(focusNode, isBackward, offset)
            return
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset
          const textContentSize = anchorNode.getTextContentSize()
          if (
            anchorNode.is(focusNode) ||
            (isBackward && offset !== 0) ||
            (!isBackward && offset !== textContentSize)
          ) {
            $removeSegment(anchorNode, isBackward, offset)
            return
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward)
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        const element =
          anchor.type === 'element'
            ? anchor.getNode()
            : anchor.getNode().getParentOrThrow()
        if (element.collapseAtStart(this)) {
          return
        }
      }
    }
    this.removeText()
    if (
      isBackward &&
      !wasCollapsed &&
      this.isCollapsed() &&
      this.anchor.type === 'element' &&
      this.anchor.offset === 0
    ) {
      const anchorNode = this.anchor.getNode()
      if (
        anchorNode.isEmpty() &&
        $isRootNode(anchorNode.getParent()) &&
        anchorNode.getIndexWithinParent() === 0
      ) {
        anchorNode.collapseAtStart(this)
      }
    }
  }
  /**
   * 현재 선택 영역을 기준으로 EditorState에서 하나의 논리적 줄 삭제 작업을 수행합니다.
   * 다양한 노드 유형을 처리합니다.
   *
   * @desc 이 메서드는 선택 영역의 현재 위치에 따라 줄을 삭제합니다.
   * 텍스트 노드와 요소 노드를 포함한 다양한 노드 유형을 적절하게 처리하며,
   * 선택 영역이 요소 노드에 있는 경우를 위해 특별한 처리를 합니다.
   *
   * @param isBackward 선택 영역이 뒤로 이동하는지 여부를 나타냅니다.
   */
  deleteLine(isBackward: boolean): void {
    if (this.isCollapsed()) {
      // `domSelection.modify('extend', ..., 'lineboundary')`가 텍스트 선택에 잘 작동하지만,
      // 요소에 끝나는 선택을 적절하게 처리하지 않기 때문에,
      // 앵커의 유형을 'text'로 변환하는 공백 문자가 추가됩니다.
      const anchorIsElement = this.anchor.type === 'element'
      if (anchorIsElement) {
        this.insertText(' ')
      }

      this.modify('extend', isBackward, 'lineboundary')

      // 선택 영역이 텍스트의 가장자리를 덮도록 확장된 경우, 부모 요소를 삭제하기 위해 한 문자 더 확장합니다.
      // 그렇지 않으면 텍스트 내용은 삭제되지만 빈 부모 노드는 남습니다.
      const endPoint = isBackward ? this.focus : this.anchor
      if (endPoint.offset === 0) {
        this.modify('extend', isBackward, 'character')
      }

      // 요소 앵커에 추가된 여분의 문자를 포함하도록 선택 영역을 조정합니다.
      if (anchorIsElement) {
        const startPoint = isBackward ? this.anchor : this.focus
        startPoint.set(startPoint.key, startPoint.offset + 1, startPoint.type)
      }
    }
    this.removeText()
  }
  /**
   * 현재 선택 영역을 기준으로 EditorState에서 하나의 논리적 단어 삭제 작업을 수행합니다.
   * 다양한 노드 유형을 처리합니다.
   *
   * @desc 이 메서드는 선택 영역의 현재 위치에 따라 단어를 삭제합니다.
   * 텍스트 노드와 요소 노드를 포함한 다양한 노드 유형을 적절하게 처리합니다.
   * 선택 영역이 접혀 있을 때, 단어 단위로 선택 영역을 확장한 후 텍스트를 삭제합니다.
   *
   * @param isBackward 선택 영역이 뒤로 이동하는지 여부를 나타냅니다.
   */
  deleteWord(isBackward: boolean): void {
    if (this.isCollapsed()) {
      const anchor = this.anchor
      const anchorNode: TextNode | ElementNode | null = anchor.getNode()
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return
      }
      this.modify('extend', isBackward, 'word')
    }
    this.removeText()
  }
  /**
   * 선택 영역이 "backwards"인지 여부를 반환합니다. "backwards"는 포커스가
   * EditorState에서 논리적으로 앵커보다 앞서 있다는 것을 의미합니다.
   * @returns 선택 영역이 backwards이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
   */
  isBackward(): boolean {
    return this.focus.isBefore(this.anchor)
  }
  /**
   * 선택 영역의 시작 및 끝 지점을 반환합니다.
   * @returns [PointType, PointType] 형태로 앵커와 포커스를 반환합니다.
   */
  getStartEndPoints(): null | [PointType, PointType] {
    return [this.anchor, this.focus]
  }
}

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection
}
/**
 * 주어진 PointType의 문자 오프셋을 반환합니다.
 *
 * @desc 이 함수는 주어진 PointType의 오프셋을 반환합니다.
 * 만약 PointType이 'text' 타입이라면, 그 오프셋 값을 그대로 반환합니다.
 * 그렇지 않다면, 부모 노드를 기준으로 자식 노드의 개수에 따라 오프셋 값을 계산하여 반환합니다.
 *
 * @param point 문자 오프셋을 얻을 PointType입니다.
 * @returns 문자의 오프셋 값을 반환합니다.
 */
function getCharacterOffset(point: PointType): number {
  const offset = point.offset
  if (point.type === 'text') {
    return offset
  }

  const parent = point.getNode()
  return offset === parent.getChildrenSize()
    ? parent.getTextContent().length
    : 0
}
/**
 * 선택된 영역의 앵커와 포커스의 문자 오프셋을 반환합니다.
 *
 * @desc 이 함수는 주어진 선택 영역(BaseSelection)의 앵커와 포커스 지점의 문자 오프셋을 반환합니다.
 * 만약 선택 영역이 비어있거나, 앵커와 포커스가 동일한 경우 [0, 0]을 반환합니다.
 * 그렇지 않으면, 각 지점의 문자 오프셋을 계산하여 반환합니다.
 *
 * @param selection 문자 오프셋을 얻을 선택 영역(BaseSelection)입니다.
 * @returns 앵커와 포커스의 문자 오프셋을 배열로 반환합니다.
 */
export function $getCharacterOffsets(
  selection: BaseSelection,
): [number, number] {
  const anchorAndFocus = selection.getStartEndPoints()
  if (anchorAndFocus === null) {
    return [0, 0]
  }
  const [anchor, focus] = anchorAndFocus
  if (
    anchor.type === 'element' &&
    focus.type === 'element' &&
    anchor.key === focus.key &&
    anchor.offset === focus.offset
  ) {
    return [0, 0]
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)]
}
/**
 * 선택 영역의 앵커와 포커스 지점을 서로 교환합니다.
 *
 * @desc 이 함수는 주어진 선택 영역(RangeSelection)의 앵커와 포커스 지점을 서로 교환합니다.
 * 이렇게 하면 선택이 반전되고, 앵커와 포커스가 서로의 위치로 바뀝니다.
 *
 * @param selection 앵커와 포커스 지점을 교환할 RangeSelection 객체입니다.
 */
function $swapPoints(selection: RangeSelection): void {
  const focus = selection.focus
  const anchor = selection.anchor
  const anchorKey = anchor.key
  const anchorOffset = anchor.offset
  const anchorType = anchor.type

  $setPointValues(anchor, focus.key, focus.offset, focus.type)
  $setPointValues(focus, anchorKey, anchorOffset, anchorType)
  selection._cachedNodes = null
}
/**
 * 네이티브 DOM 선택 영역을 이동시키거나 확장합니다.
 *
 * @desc 이 함수는 주어진 네이티브 DOM 선택 객체(`Selection`)의 위치를 이동시키거나 확장합니다.
 * `Selection.modify()` 메서드를 사용하여 선택 영역이나 커서 위치에 변경을 적용합니다.
 * 이 메서드는 현재 일부 브라우저에서는 비표준 상태일 수 있습니다.
 *
 * @param domSelection 이동 또는 확장할 네이티브 DOM 선택 객체(`Selection`).
 * @param alter 변경 유형을 나타내는 문자열. 'move'는 선택 영역을 이동시키고, 'extend'는 선택 영역을 확장합니다.
 * @param direction 이동 또는 확장할 방향을 나타내는 문자열. 'backward', 'forward', 'left', 'right' 중 하나입니다.
 * @param granularity 변경을 적용할 세분화 수준을 나타내는 문자열. 'character', 'word', 'lineboundary' 중 하나입니다.
 */
function moveNativeSelection(
  domSelection: Selection,
  alter: 'move' | 'extend',
  direction: 'backward' | 'forward' | 'left' | 'right',
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity)
}
/**
 * 유니코드 문자의 경우 캐럿 선택을 업데이트합니다.
 *
 * @desc 이 함수는 유니코드 문자(특히 다중 바이트 문자)를 처리하기 위해 주어진 RangeSelection 객체의 캐럿 선택을 업데이트합니다.
 * 캐럿이 다중 바이트 문자의 중간에 있지 않도록 조정합니다.
 *
 * @param selection - RangeSelection 객체입니다.
 * @param isBackward - 선택이 뒤로 이동하는지 여부를 나타내는 부울 값입니다.
 */
function $updateCaretSelectionForUnicodeCharacter(
  selection: RangeSelection,
  isBackward: boolean,
): void {
  const anchor = selection.anchor
  const focus = selection.focus
  const anchorNode = anchor.getNode()
  const focusNode = focus.getNode()

  if (
    anchorNode === focusNode &&
    anchor.type === 'text' &&
    focus.type === 'text'
  ) {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset
    const focusOffset = focus.offset
    const isBefore = anchorOffset < focusOffset
    const startOffset = isBefore ? anchorOffset : focusOffset
    const endOffset = isBefore ? focusOffset : anchorOffset
    const characterOffset = endOffset - 1

    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset)
      if (!doesContainGrapheme(text)) {
        if (isBackward) {
          focus.offset = characterOffset
        } else {
          anchor.offset = characterOffset
        }
      }
    }
  } else {
    // TODO Handling of multibyte characters
  }
}
/**
 * 텍스트 노드에서 지정된 오프셋으로 분할된 세그먼트를 제거합니다.
 *
 * @desc 이 함수는 텍스트 노드에서 주어진 오프셋을 기준으로 텍스트를 분할하고,
 * 분할된 텍스트 조각 중 하나를 제거합니다. 제거된 후 텍스트 노드가 비어 있으면
 * 노드를 삭제하고, 그렇지 않으면 나머지 텍스트를 설정하고 캐럿 위치를 조정합니다.
 *
 * @param node - 텍스트 노드입니다.
 * @param isBackward - 분할 방향을 나타내는 부울 값입니다.
 * @param offset - 텍스트 노드에서 분할할 오프셋입니다.
 */
function $removeSegment(
  node: TextNode,
  isBackward: boolean,
  offset: number,
): void {
  const textNode = node
  const textContent = textNode.getTextContent()
  const split = textContent.split(/(?=\s)/g)
  const splitLength = split.length
  let segmentOffset = 0
  let restoreOffset: number | undefined = 0

  for (let i = 0; i < splitLength; i++) {
    const text = split[i]
    const isLast = i === splitLength - 1
    restoreOffset = segmentOffset
    segmentOffset += text.length

    if (
      (isBackward && segmentOffset === offset) ||
      segmentOffset > offset ||
      isLast
    ) {
      split.splice(i, 1)
      if (isLast) {
        restoreOffset = undefined
      }
      break
    }
  }
  const nextTextContent = split.join('').trim()

  if (nextTextContent === '') {
    textNode.remove()
  } else {
    textNode.setTextContent(nextTextContent)
    textNode.select(restoreOffset, restoreOffset)
  }
}
/**
 * 조상의 해석 여부를 결정합니다.
 *
 * @desc 이 함수는 주어진 요소 노드의 부모를 검사하여 조상을 해석할지 여부를 결정합니다.
 * 주어진 조건에 따라 부모 노드가 비어 있을 수 없는 경우에 해석이 필요합니다.
 *
 * @param resolvedElement - 검사할 요소 노드입니다.
 * @param _resolvedOffset - 요소 노드 내에서의 오프셋입니다.
 * @param lastPoint - 이전 포인트입니다. null일 수 있습니다.
 * @returns 조상을 해석해야 하는 경우 true를 반환합니다.
 */
function shouldResolveAncestor(
  resolvedElement: ElementNode,
  _resolvedOffset: number,
  lastPoint: null | PointType,
): boolean {
  const parent = resolvedElement.getParent()
  return (
    lastPoint === null ||
    parent === null ||
    !parent.canBeEmpty() ||
    parent !== lastPoint.getNode()
  )
}
/**
 * 주어진 DOM 노드와 오프셋을 기반으로 LexicalEditor 내의 포인트를 해석합니다.
 * 선택된 노드를 TextNode로 해석하거나 적절한 요소 노드로 해석하여 반환합니다.
 *
 * @param dom - 해석할 DOM 노드
 * @param offset - DOM 노드 내의 오프셋
 * @param lastPoint - 이전 포인트, null일 수 있습니다.
 * @param editor - LexicalEditor 인스턴스
 * @returns 해석된 PointType 객체 또는 null
 */
function $internalResolveSelectionPoint(
  dom: Node,
  offset: number,
  lastPoint: null | PointType,
  editor: LexicalEditor,
): null | PointType {
  let resolvedOffset = offset
  let resolvedNode: TextNode | LexicalNode | null
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (dom.nodeType === DOM_ELEMENT_TYPE) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes
    const childNodesLength = childNodes.length
    const blockCursorElement = editor._blockCursorElement
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true
      resolvedOffset = childNodesLength - 1
    }
    let childDOM = childNodes[resolvedOffset]
    let hasBlockCursor = false
    if (childDOM === blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1]
      hasBlockCursor = true
    } else if (blockCursorElement !== null) {
      const blockCursorElementParent = blockCursorElement.parentNode
      if (dom === blockCursorElementParent) {
        const blockCursorOffset = Array.prototype.indexOf.call(
          blockCursorElementParent.children,
          blockCursorElement,
        )
        if (offset > blockCursorOffset) {
          resolvedOffset--
        }
      }
    }
    resolvedNode = $getNodeFromDOM(childDOM)

    if ($isTextNode(resolvedNode)) {
      resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd)
    } else {
      let resolvedElement = $getNodeFromDOM(dom)
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null
      }
      if ($isElementNode(resolvedElement)) {
        resolvedOffset = Math.min(
          resolvedElement.getChildrenSize(),
          resolvedOffset,
        )
        let child = resolvedElement.getChildAtIndex(resolvedOffset)
        if (
          $isElementNode(child) &&
          shouldResolveAncestor(child, resolvedOffset, lastPoint)
        ) {
          const descendant = moveSelectionToEnd
            ? child.getLastDescendant()
            : child.getFirstDescendant()
          if (descendant === null) {
            resolvedElement = child
          } else {
            child = descendant
            resolvedElement = $isElementNode(child)
              ? child
              : child.getParentOrThrow()
          }
          resolvedOffset = 0
        }
        if ($isTextNode(child)) {
          resolvedNode = child
          resolvedElement = null
          resolvedOffset = getTextNodeOffset(child, moveSelectionToEnd)
        } else if (
          child !== resolvedElement &&
          moveSelectionToEnd &&
          !hasBlockCursor
        ) {
          resolvedOffset++
        }
      } else {
        const index = resolvedElement.getIndexWithinParent()
        // When selecting decorators, there can be some selection issues when using resolvedOffset,
        // and instead we should be checking if we're using the offset
        if (
          offset === 0 &&
          $isDecoratorNode(resolvedElement) &&
          $getNodeFromDOM(dom) === resolvedElement
        ) {
          resolvedOffset = index
        } else {
          resolvedOffset = index + 1
        }
        resolvedElement = resolvedElement.getParentOrThrow()
      }
      if ($isElementNode(resolvedElement)) {
        return $createPoint(resolvedElement.__key, resolvedOffset, 'element')
      }
    }
  } else {
    // TextNode or null
    resolvedNode = $getNodeFromDOM(dom)
  }
  if (!$isTextNode(resolvedNode)) {
    return null
  }
  return $createPoint(resolvedNode.__key, resolvedOffset, 'text')
}
/**
 * 주어진 Selection의 경계 지점에서의 포인트를 해결합니다.
 *
 * @param {TextPointType} point - 포인트를 해결할 텍스트 포인트입니다.
 * @param {boolean} isBackward - 선택 범위가 역방향인지 여부를 나타내는 플래그입니다.
 * @param {boolean} isCollapsed - 선택 범위가 접혀 있는지 여부를 나타내는 플래그입니다.
 */
function resolveSelectionPointOnBoundary(
  point: TextPointType,
  isBackward: boolean,
  isCollapsed: boolean,
): void {
  const offset = point.offset
  const node = point.getNode()

  if (offset === 0) {
    const prevSibling = node.getPreviousSibling()
    const parent = node.getParent()

    if (!isBackward) {
      if (
        $isElementNode(prevSibling) &&
        !isCollapsed &&
        prevSibling.isInline()
      ) {
        point.key = prevSibling.__key
        point.offset = prevSibling.getChildrenSize()
        // @ts-expect-error: intentional
        point.type = 'element'
      } else if ($isTextNode(prevSibling)) {
        point.key = prevSibling.__key
        point.offset = prevSibling.getTextContent().length
      }
    } else if (
      (isCollapsed || !isBackward) &&
      prevSibling === null &&
      $isElementNode(parent) &&
      parent.isInline()
    ) {
      const parentSibling = parent.getPreviousSibling()
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key
        point.offset = parentSibling.getTextContent().length
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling()
    const parent = node.getParent()

    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.key = nextSibling.__key
      point.offset = 0
      // @ts-expect-error: intentional
      point.type = 'element'
    } else if (
      (isCollapsed || isBackward) &&
      nextSibling === null &&
      $isElementNode(parent) &&
      parent.isInline() &&
      !parent.canInsertTextAfter()
    ) {
      const parentSibling = parent.getNextSibling()
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key
        point.offset = 0
      }
    }
  }
}
/**
 * 주어진 앵커와 포커스 포인트를 텍스트 노드의 경계에 맞게 정규화합니다.
 *
 * @param {PointType} anchor - 정규화할 앵커 포인트입니다.
 * @param {PointType} focus - 정규화할 포커스 포인트입니다.
 * @param {null | BaseSelection} lastSelection - 이전 선택 상태입니다.
 */
function $normalizeSelectionPointsForBoundaries(
  anchor: PointType,
  focus: PointType,
  lastSelection: null | BaseSelection,
): void {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus)
    const isCollapsed = anchor.is(focus)

    // 텍스트 노드의 시작 부분에 있고, 형제가 텍스트 노드이거나 인라인 요소인 경우 오프셋을 이전 형제로 정규화 시도.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed)
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed)

    if (isCollapsed) {
      focus.key = anchor.key
      focus.offset = anchor.offset
      focus.type = anchor.type
    }
    const editor = getActiveEditor()

    if (
      editor.isComposing() &&
      editor._compositionKey !== anchor.key &&
      $isRangeSelection(lastSelection)
    ) {
      const lastAnchor = lastSelection.anchor
      const lastFocus = lastSelection.focus
      $setPointValues(
        anchor,
        lastAnchor.key,
        lastAnchor.offset,
        lastAnchor.type,
      )
      $setPointValues(focus, lastFocus.key, lastFocus.offset, lastFocus.type)
    }
  }
}
/**
 * 주어진 앵커와 포커스 DOM 노드를 기반으로 선택 포인트를 해결합니다.
 *
 * @param {null | Node} anchorDOM - 앵커 DOM 노드입니다.
 * @param {number} anchorOffset - 앵커 오프셋입니다.
 * @param {null | Node} focusDOM - 포커스 DOM 노드입니다.
 * @param {number} focusOffset - 포커스 오프셋입니다.
 * @param {LexicalEditor} editor - Lexical 에디터 인스턴스입니다.
 * @param {null | BaseSelection} lastSelection - 이전 선택 상태입니다.
 * @returns {null | [PointType, PointType]} - 해결된 선택 포인트 쌍입니다.
 */

function $internalResolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: LexicalEditor,
  lastSelection: null | BaseSelection,
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null
  }
  const resolvedAnchorPoint = $internalResolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    $isRangeSelection(lastSelection) ? lastSelection.anchor : null,
    editor,
  )
  if (resolvedAnchorPoint === null) {
    return null
  }
  const resolvedFocusPoint = $internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
    editor,
  )
  if (resolvedFocusPoint === null) {
    return null
  }
  if (
    resolvedAnchorPoint.type === 'element' &&
    resolvedFocusPoint.type === 'element'
  ) {
    const anchorNode = $getNodeFromDOM(anchorDOM)
    const focusNode = $getNodeFromDOM(focusDOM)
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  $normalizeSelectionPointsForBoundaries(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection,
  )

  return [resolvedAnchorPoint, resolvedFocusPoint]
}
/**
 * 주어진 노드가 블록 엘리먼트 노드인지 확인합니다.
 *
 * @param {LexicalNode | null | undefined} node - 확인할 Lexical 노드입니다.
 * @returns {boolean} - 노드가 블록 엘리먼트 노드인 경우 true를 반환합니다.
 */
export function $isBlockElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return $isElementNode(node) && !node.isInline()
}
/**
 * 기존 선택 영역이 null일 때 선택 영역을 만듭니다.
 * 즉, 편집기가 현재 편집기 외부에 존재할 때 선택 영역을 강제로 설정합니다.
 *
 * @param {NodeKey} anchorKey - 앵커 노드의 키입니다.
 * @param {number} anchorOffset - 앵커 오프셋입니다.
 * @param {NodeKey} focusKey - 포커스 노드의 키입니다.
 * @param {number} focusOffset - 포커스 오프셋입니다.
 * @param {'text' | 'element'} anchorType - 앵커 타입입니다 ('text' 또는 'element').
 * @param {'text' | 'element'} focusType - 포커스 타입입니다 ('text' 또는 'element').
 * @returns {RangeSelection} - 생성된 RangeSelection 객체를 반환합니다.
 */
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
 * 새로운 RangeSelection을 생성합니다.
 * 앵커와 포커스 포인트는 'root' 엘리먼트의 시작 지점으로 설정됩니다.
 *
 * @returns {RangeSelection} - 생성된 RangeSelection 객체를 반환합니다.
 */
export function $createRangeSelection(): RangeSelection {
  const anchor = $createPoint('root', 0, 'element')
  const focus = $createPoint('root', 0, 'element')
  return new RangeSelection(anchor, focus, 0, '')
}
/**
 * 새로운 NodeSelection을 생성합니다.
 * 선택된 노드의 키를 저장하는 빈 Set으로 초기화됩니다.
 *
 * @returns {NodeSelection} - 생성된 NodeSelection 객체를 반환합니다.
 */
export function $createNodeSelection(): NodeSelection {
  return new NodeSelection(new Set())
}
/**
 * 에디터 상태에 맞는 Selection을 생성합니다.
 * RangeSelection이나 null이 전달된 경우 새로운 RangeSelection을 생성합니다.
 * 기존의 NodeSelection이나 GridSelection이 전달된 경우 해당 Selection을 복제합니다.
 *
 * @param {LexicalEditor} editor - LexicalEditor 인스턴스
 * @returns {null | BaseSelection} - 생성된 Selection 객체 또는 null을 반환합니다.
 */
export function $internalCreateSelection(
  editor: LexicalEditor,
): null | BaseSelection {
  const currentEditorState = editor.getEditorState()
  const lastSelection = currentEditorState._selection
  const domSelection = getDOMSelection(editor._window)

  if ($isRangeSelection(lastSelection) || lastSelection == null) {
    return $internalCreateRangeSelection(
      lastSelection,
      domSelection,
      editor,
      null,
    )
  }
  return lastSelection.clone()
}
/**
 * DOM Selection으로부터 RangeSelection을 생성합니다.
 *
 * @param {Selection | null} domSelection - DOM Selection 객체 또는 null
 * @param {LexicalEditor} editor - LexicalEditor 인스턴스
 * @returns {null | RangeSelection} - 생성된 RangeSelection 객체 또는 null을 반환합니다.
 */
export function $createRangeSelectionFromDom(
  domSelection: Selection | null,
  editor: LexicalEditor,
): null | RangeSelection {
  return $internalCreateRangeSelection(null, domSelection, editor, null)
}
/**
 * RangeSelection 객체를 생성합니다.
 *
 * @param {null | BaseSelection} lastSelection - 이전 Selection 객체 또는 null
 * @param {Selection | null} domSelection - DOM Selection 객체 또는 null
 * @param {LexicalEditor} editor - LexicalEditor 인스턴스
 * @param {UIEvent | Event | null} event - 이벤트 객체 또는 null
 * @returns {null | RangeSelection} - 생성된 RangeSelection 객체 또는 null을 반환합니다.
 */
export function $internalCreateRangeSelection(
  lastSelection: null | BaseSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
  event: UIEvent | Event | null,
): null | RangeSelection {
  const windowObj = editor._window
  if (windowObj === null) {
    return null
  }
  // 우리가 선택 영역을 생성할 때, 가능한 경우 이전 선택 영역을 사용하려고 합니다.
  // 실제 사용자 선택 변경이 발생한 경우를 제외하고는 말입니다. 새로운 선택 영역을
  // 생성해야 할 때, 우리는 앵커(anchor)와 포커스(focus) 노드 모두에 대해 텍스트
  // 노드를 가질 수 있는지 확인합니다. 이 조건이 충족되면, 해당 선택 영역을 반환하고,
  // 이를 편집기의 업데이트 사이클 동안 사용할 수 있는 가변 객체로 사용합니다.
  // 선택 영역이 변경되어 네이티브 DOM 선택을 업데이트해야 하는 경우, 이는 "dirty"로
  // 표시됩니다. 선택 영역이 변경되었지만 기존 DOM 선택과 일치하는 경우, 우리는
  // 동기화만 필요합니다. 그렇지 않으면, 일반적으로 reconciliation(재조정) 동안 선택
  // 영역을 업데이트하는 작업을 중단합니다. 단, 더러운 노드가 재조정이 필요한 경우는
  // 예외입니다.

  const windowEvent = event || windowObj.event
  const eventType = windowEvent ? windowEvent.type : undefined
  const isSelectionChange = eventType === 'selectionchange'
  const useDOMSelection =
    !getIsProcessingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' &&
        windowEvent &&
        (windowEvent as InputEvent).detail === 3) ||
      eventType === 'drop' ||
      eventType === undefined)
  let anchorDOM, focusDOM, anchorOffset, focusOffset

  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null
    }
    anchorDOM = domSelection.anchorNode
    focusDOM = domSelection.focusNode
    anchorOffset = domSelection.anchorOffset
    focusOffset = domSelection.focusOffset
    if (
      isSelectionChange &&
      $isRangeSelection(lastSelection) &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return lastSelection.clone()
    }
  } else {
    return lastSelection.clone()
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = $internalResolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
    lastSelection,
  )
  if (resolvedSelectionPoints === null) {
    return null
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints
  return new RangeSelection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    !$isRangeSelection(lastSelection) ? 0 : lastSelection.format,
    !$isRangeSelection(lastSelection) ? '' : lastSelection.style,
  )
}
/**
 * 현재 활성화된 편집기의 선택 영역을 반환합니다.
 *
 * @returns 현재 선택된 영역을 나타내는 BaseSelection 객체 또는 null.
 */
export function $getSelection(): null | BaseSelection {
  const editorState = getActiveEditorState()
  return editorState._selection
}
/**
 * 이전 편집기 상태의 선택 영역을 반환합니다.
 *
 * @returns 이전 선택된 영역을 나타내는 BaseSelection 객체 또는 null.
 */
export function $getPreviousSelection(): null | BaseSelection {
  const editor = getActiveEditor()
  return editor._editorState._selection
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
 * 선택 영역 변환을 적용합니다. 이전 편집기 상태와 다음 편집기 상태를 비교하여
 * 선택 영역이 텍스트 노드에 있을 경우 선택 변환을 수행합니다.
 *
 * @param nextEditorState - 다음 편집기 상태입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 */
export function applySelectionTransforms(
  nextEditorState: EditorState,
  editor: LexicalEditor,
): void {
  const prevEditorState = editor.getEditorState()
  const prevSelection = prevEditorState._selection
  const nextSelection = nextEditorState._selection
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor
    const focus = nextSelection.focus
    let anchorNode

    if (anchor.type === 'text') {
      anchorNode = anchor.getNode()
      anchorNode.selectionTransform(prevSelection, nextSelection)
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode()
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection)
      }
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

/**
 * 텍스트 노드 병합 후 선택 포인트의 오프셋을 조정합니다.
 *
 * @param point - 조정할 선택 포인트 (PointType)
 * @param isBefore - 병합 대상 노드가 현재 노드 이전에 있는지 여부
 * @param key - 병합 결과 노드의 키
 * @param target - 병합되는 대상 텍스트 노드
 * @param textLength - 병합 전 현재 노드의 텍스트 길이
 *
 * @description
 * 이 함수는 두 텍스트 노드가 병합될 때 선택 포인트의 위치를 적절히 조정합니다.
 * 텍스트 선택과 요소 선택을 다르게 처리합니다:
 *
 * 1. 텍스트 선택의 경우:
 *    - 선택 포인트의 키를 병합 결과 노드의 키로 업데이트합니다.
 *    - 병합 대상이 현재 노드 이후에 있었다면, 오프셋에 현재 노드의 길이를 더합니다.
 *
 * 2. 요소 선택의 경우:
 *    - 선택 포인트가 병합된 노드 이후를 가리키고 있었다면, 오프셋을 1 감소시킵니다.
 *
 * @example
 * // 텍스트 선택의 경우
 * const point = { type: 'text', key: 'target', offset: 3 };
 * adjustPointOffsetForMergedSibling(point, false, 'merged', targetNode, 5);
 * // 결과: point = { type: 'text', key: 'merged', offset: 8 }
 *
 * @example
 * // 요소 선택의 경우
 * const point = { type: 'element', key: 'parent', offset: 2 };
 * adjustPointOffsetForMergedSibling(point, true, 'merged', targetNode, 5);
 * // 결과: point = { type: 'element', key: 'parent', offset: 1 }
 *
 * @note
 * 이 함수는 주로 텍스트 노드 병합 작업 중 내부적으로 사용됩니다.
 */
export function adjustPointOffsetForMergedSibling(
  point: PointType,
  isBefore: boolean,
  key: NodeKey,
  target: TextNode,
  textLength: number,
): void {
  if (point.type === 'text') {
    point.key = key
    if (!isBefore) {
      point.offset += textLength
    }
  } else if (point.offset > target.getIndexWithinParent()) {
    point.offset -= 1
  }
}
/**
 * 이전 선택 영역과 다음 선택 영역을 비교하여 DOM에서 선택 영역을 업데이트합니다.
 *
 * @param prevSelection - 이전 선택 영역입니다.
 * @param nextSelection - 다음 선택 영역입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 * @param domSelection - 현재 DOM 선택 영역입니다.
 * @param tags - 선택 영역 업데이트와 관련된 태그 모음입니다.
 * @param rootElement - 루트 HTML 요소입니다.
 * @param _nodeCount - 노드 개수입니다.
 */
export function updateDOMSelection(
  prevSelection: BaseSelection | null,
  nextSelection: BaseSelection | null,
  editor: LexicalEditor,
  domSelection: Selection,
  tags: Set<string>,
  rootElement: HTMLElement,
  _nodeCount: number,
): void {
  const anchorDOMNode = domSelection.anchorNode
  const focusDOMNode = domSelection.focusNode
  const anchorOffset = domSelection.anchorOffset
  const focusOffset = domSelection.focusOffset
  const activeElement = document.activeElement

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (
    (tags.has('collaboration') && activeElement !== rootElement) ||
    (activeElement !== null &&
      isSelectionCapturedInDecoratorInput(activeElement))
  ) {
    return
  }

  if (!$isRangeSelection(nextSelection)) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (
      prevSelection !== null &&
      isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)
    ) {
      domSelection.removeAllRanges()
    }

    return
  }

  const anchor = nextSelection.anchor
  const focus = nextSelection.focus
  const anchorKey = anchor.key
  const focusKey = focus.key
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey)
  const focusDOM = getElementByKeyOrThrow(editor, focusKey)
  const nextAnchorOffset = anchor.offset
  const nextFocusOffset = focus.offset
  const nextFormat = nextSelection.format
  const nextStyle = nextSelection.style
  const isCollapsed = nextSelection.isCollapsed()
  let nextAnchorNode: HTMLElement | Text | null = anchorDOM
  let nextFocusNode: HTMLElement | Text | null = focusDOM
  let anchorFormatOrStyleChanged = false

  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM)
    const anchorNode = anchor.getNode()
    anchorFormatOrStyleChanged =
      anchorNode.getFormat() !== nextFormat ||
      anchorNode.getStyle() !== nextStyle
  } else if (
    $isRangeSelection(prevSelection) &&
    prevSelection.anchor.type === 'text'
  ) {
    anchorFormatOrStyleChanged = true
  }

  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM)
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return
  }

  if (
    isCollapsed &&
    (prevSelection === null ||
      anchorFormatOrStyleChanged ||
      ($isRangeSelection(prevSelection) &&
        (prevSelection.format !== nextFormat ||
          prevSelection.style !== nextStyle)))
  ) {
    markCollapsedSelectionFormat(
      nextFormat,
      nextStyle,
      nextAnchorOffset,
      anchorKey,
      performance.now(),
    )
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode && // Badly interpreted range selection when collapsed - #1482
    !(domSelection.type === 'Range' && isCollapsed)
  ) {
    // If the root element does not have focus, ensure it has focus
    if (activeElement === null || !rootElement.contains(activeElement)) {
      rootElement.focus({
        preventScroll: true,
      })
    }
    if (anchor.type !== 'element') {
      return
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      nextAnchorNode,
      nextAnchorOffset,
      nextFocusNode,
      nextFocusOffset,
    )
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
    if (__DEV__) {
      console.warn(error)
    }
  }
  if (
    !tags.has('skip-scroll-into-view') &&
    nextSelection.isCollapsed() &&
    rootElement !== null &&
    rootElement === document.activeElement
  ) {
    const selectionTarget: null | Range | HTMLElement | Text =
      nextSelection instanceof RangeSelection &&
      nextSelection.anchor.type === 'element'
        ? (nextAnchorNode.childNodes[nextAnchorOffset] as HTMLElement | Text) ||
          null
        : domSelection.rangeCount > 0
          ? domSelection.getRangeAt(0)
          : null
    if (selectionTarget !== null) {
      let selectionRect: DOMRect
      if (selectionTarget instanceof Text) {
        const range = document.createRange()
        range.selectNode(selectionTarget)
        selectionRect = range.getBoundingClientRect()
      } else {
        selectionRect = selectionTarget.getBoundingClientRect()
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement)
    }
  }

  markSelectionChangeFromDOMUpdate()
}
/**
 * 주어진 노드를 현재 선택 영역에 삽입합니다.
 *
 * @param nodes - 삽입할 LexicalNode 배열
 */
export function $insertNodes(nodes: Array<LexicalNode>) {
  let selection = $getSelection() || $getPreviousSelection()

  if (selection === null) {
    selection = $getRoot().selectEnd()
  }
  selection.insertNodes(nodes)
}
/**
 * 현재 선택 영역의 텍스트 내용을 반환합니다.
 *
 * @returns 현재 선택 영역의 텍스트 내용
 */
export function $getTextContent(): string {
  const selection = $getSelection()
  if (selection === null) {
    return ''
  }
  return selection.getTextContent()
}
/**
 * 텍스트를 제거하고 블록을 분할합니다.
 *
 * @param selection - RangeSelection 객체
 * @returns 분할된 블록의 오프셋
 */
function $removeTextAndSplitBlock(selection: RangeSelection): number {
  let selection_ = selection
  if (!selection.isCollapsed()) {
    selection_.removeText()
  }
  // 노드 교체의 결과로 새로운 선택이 발생할 수 있으며, 이 경우 $setSelection을 통해 등록됩니다.
  const newSelection = $getSelection()
  if ($isRangeSelection(newSelection)) {
    selection_ = newSelection
  }

  invariant(
    $isRangeSelection(selection_),
    'Unexpected dirty selection to be null',
  )

  const anchor = selection_.anchor
  let node = anchor.getNode()
  let offset = anchor.offset

  while (!INTERNAL_$isBlock(node)) {
    ;[node, offset] = $splitNodeAtPoint(node, offset)
  }

  return offset
}
/**
 * 지정된 오프셋에서 노드를 분할합니다.
 *
 * @param node - LexicalNode 객체
 * @param offset - 분할할 오프셋
 * @returns 분할된 노드와 부모 요소의 배열
 */
function $splitNodeAtPoint(
  node: LexicalNode,
  offset: number,
): [parent: ElementNode, offset: number] {
  const parent = node.getParent()
  if (!parent) {
    const paragraph = $createParagraphNode()
    $getRoot().append(paragraph)
    paragraph.select()
    return [$getRoot(), 0]
  }

  if ($isTextNode(node)) {
    const split = node.splitText(offset)
    if (split.length === 0) {
      return [parent, node.getIndexWithinParent()]
    }
    const x = offset === 0 ? 0 : 1
    const index = split[0].getIndexWithinParent() + x

    return [parent, index]
  }

  if (!$isElementNode(node) || offset === 0) {
    return [parent, node.getIndexWithinParent()]
  }

  const firstToAppend = node.getChildAtIndex(offset)
  if (firstToAppend) {
    const insertPoint = new RangeSelection(
      $createPoint(node.__key, offset, 'element'),
      $createPoint(node.__key, offset, 'element'),
      0,
      '',
    )
    const newElement = node.insertNewAfter(insertPoint) as ElementNode | null
    if (newElement) {
      newElement.append(firstToAppend, ...firstToAppend.getNextSiblings())
    }
  }
  return [parent, node.getIndexWithinParent() + 1]
}
/**
 * 인라인 노드를 래핑하여 블록 요소로 만듭니다.
 *
 * @param nodes - LexicalNode 배열
 * @returns 래핑된 가상 루트 요소
 */
function $wrapInlineNodes(nodes: LexicalNode[]) {
  // We temporarily insert the topLevelNodes into an arbitrary ElementNode,
  // since insertAfter does not work on nodes that have no parent (TO-DO: fix that).
  // 임시로 최상위 노드를 임의의 ElementNode에 삽입합니다.
  const virtualRoot = $createParagraphNode()

  let currentBlock = null
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    const isLineBreakNode = $isLineBreakNode(node)

    if (
      isLineBreakNode ||
      ($isDecoratorNode(node) && node.isInline()) ||
      ($isElementNode(node) && node.isInline()) ||
      $isTextNode(node) ||
      node.isParentRequired()
    ) {
      if (currentBlock === null) {
        currentBlock = node.createParentElementNode()
        virtualRoot.append(currentBlock)
        // In the case of LineBreakNode, we just need to
        // add an empty ParagraphNode to the topLevelBlocks.
        // LineBreakNode의 경우, 단순히 빈 ParagraphNode를 최상위 블록에 추가합니다.
        if (isLineBreakNode) {
          continue
        }
      }

      if (currentBlock !== null) {
        currentBlock.append(node)
      }
    } else {
      virtualRoot.append(node)
      currentBlock = null
    }
  }

  return virtualRoot
}

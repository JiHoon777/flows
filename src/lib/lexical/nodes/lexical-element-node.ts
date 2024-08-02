import type {
  NodeKey,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type {
  PointType,
  RangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import type { KlassConstructor, Spread } from '@/lib/lexical/lexical-type.ts'
import type { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

import {
  DOUBLE_LINE_BREAK,
  ELEMENT_FORMAT_TO_TYPE,
  ELEMENT_TYPE_TO_FORMAT,
} from '@/lib/lexical/lexical-constants.ts'
import { $getNodeByKey, LexicalNode } from '@/lib/lexical/lexical-node.ts'
import {
  $getSelection,
  $internalMakeRangeSelection,
  $isRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import {
  errorOnReadOnly,
  getActiveEditor,
} from '@/lib/lexical/lexical-updates.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'

export type ElementFormatType =
  | 'left'
  | 'start'
  | 'center'
  | 'right'
  | 'end'
  | 'justify'
  | ''

export type SerializedElementNode<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> = Spread<
  {
    children: T[]
    direction: 'ltr' | 'rtl' | null
    format: ElementFormatType
    indent: number
  },
  SerializedLexicalNode
>

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ElementNode {
  getTopLevelElement(): ElementNode | null
  getTopLevelElementOrThrow(): ElementNode
}

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ElementNode extends LexicalNode {
  declare ['constructor']: KlassConstructor<typeof ElementNode>
  /** @internal */
  __first: null | NodeKey
  /** @internal */
  __last: null | NodeKey
  /** @internal */
  __size: number
  /** @internal */
  __format: number
  /** @internal */
  __style: string
  /** @internal */
  __indent: number
  /** @internal */
  __dir: 'ltr' | 'rtl' | null

  constructor(key?: NodeKey) {
    super(key)
    this.__first = null
    this.__last = null
    this.__size = 0
    this.__format = 0
    this.__style = ''
    this.__indent = 0
    this.__dir = null
  }

  getFormat(): number {
    const self = this.getLatest()
    return self.__format
  }
  getFormatType(): ElementFormatType {
    const format = this.getFormat()
    return ELEMENT_FORMAT_TO_TYPE[format] || ''
  }
  getStyle(): string {
    const self = this.getLatest()
    return self.__style
  }
  getIndent(): number {
    const self = this.getLatest()
    return self.__indent
  }
  getChildren<T extends LexicalNode>(): Array<T> {
    const children: Array<T> = []
    let child: T | null = this.getFirstChild()
    while (child !== null) {
      children.push(child)
      child = child.getNextSibling()
    }
    return children
  }
  getChildrenKeys(): Array<NodeKey> {
    const children: Array<NodeKey> = []
    let child: LexicalNode | null = this.getFirstChild()
    while (child !== null) {
      children.push(child.__key)
      child = child.getNextSibling()
    }
    return children
  }
  getChildrenSize(): number {
    const self = this.getLatest()
    return self.__size
  }
  isEmpty(): boolean {
    return this.getChildrenSize() === 0
  }
  isDirty(): boolean {
    const editor = getActiveEditor()
    const dirtyElements = editor._dirtyElements
    return dirtyElements !== null && dirtyElements.has(this.__key)
  }
  isLastChild(): boolean {
    const self = this.getLatest()
    const parentLastChild = this.getParentOrThrow().getLastChild()
    return parentLastChild !== null && parentLastChild.is(self)
  }
  getAllTextNodes(): Array<TextNode> {
    const textNodes: Array<TextNode> = []
    let child: LexicalNode | null = this.getFirstChild()
    while (child !== null) {
      if ($isTextNode(child)) {
        textNodes.push(child)
      }
      if ($isElementNode(child)) {
        const subChildrenNodes = child.getAllTextNodes()
        textNodes.push(...subChildrenNodes)
      }
      child = child.getNextSibling()
    }
    return textNodes
  }
  getFirstDescendant<T extends LexicalNode>(): null | T {
    let node = this.getFirstChild<T>()
    while ($isElementNode(node)) {
      const child = node.getFirstChild<T>()
      if (child === null) {
        break
      }
      node = child
    }
    return node
  }
  getLastDescendant<T extends LexicalNode>(): null | T {
    let node = this.getLastChild<T>()
    while ($isElementNode(node)) {
      const child = node.getLastChild<T>()
      if (child === null) {
        break
      }
      node = child
    }
    return node
  }
  getDescendantByIndex<T extends LexicalNode>(index: number): null | T {
    const children = this.getChildren<T>()
    const childrenLength = children.length
    // For non-empty element nodes, we resolve its descendant
    // (either a leaf node or the bottom-most element)
    if (index >= childrenLength) {
      const resolvedNode = children[childrenLength - 1]
      return (
        ($isElementNode(resolvedNode) && resolvedNode.getLastDescendant()) ||
        resolvedNode ||
        null
      )
    }
    const resolvedNode = children[index]
    return (
      ($isElementNode(resolvedNode) && resolvedNode.getFirstDescendant()) ||
      resolvedNode ||
      null
    )
  }
  getFirstChild<T extends LexicalNode>(): null | T {
    const self = this.getLatest()
    const firstKey = self.__first
    return firstKey === null ? null : $getNodeByKey<T>(firstKey)
  }
  getFirstChildOrThrow<T extends LexicalNode>(): T {
    const firstChild = this.getFirstChild<T>()
    if (firstChild === null) {
      invariant(false, 'Expected node %s to have a first child.', this.__key)
    }
    return firstChild
  }
  getLastChild<T extends LexicalNode>(): null | T {
    const self = this.getLatest()
    const lastKey = self.__last
    return lastKey === null ? null : $getNodeByKey<T>(lastKey)
  }
  getLastChildOrThrow<T extends LexicalNode>(): T {
    const lastChild = this.getLastChild<T>()
    if (lastChild === null) {
      invariant(false, 'Expected node %s to have a last child.', this.__key)
    }
    return lastChild
  }
  getChildAtIndex<T extends LexicalNode>(index: number): null | T {
    const size = this.getChildrenSize()
    let node: null | T
    let i

    // 요청된 인덱스가 전체 크기의 절반보다 작으면 앞에서부터 검색합니다.
    if (index < size / 2) {
      node = this.getFirstChild<T>()
      i = 0
      while (node !== null && i <= index) {
        if (i === index) {
          return node
        }
        node = node.getNextSibling()
        i++
      }
      return null
    }
    // 요청된 인덱스가 전체 크기의 절반 이상이면 뒤에서부터 검색합니다.
    node = this.getLastChild<T>()
    i = size - 1
    while (node !== null && i >= index) {
      if (i === index) {
        return node
      }
      node = node.getPreviousSibling()
      i--
    }
    return null
  }
  getTextContent(): string {
    let textContent = ''
    const children = this.getChildren()
    const childrenLength = children.length
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i]
      textContent += child.getTextContent()
      if (
        $isElementNode(child) &&
        i !== childrenLength - 1 &&
        !child.isInline()
      ) {
        textContent += DOUBLE_LINE_BREAK
      }
    }
    return textContent
  }
  getTextContentSize(): number {
    let textContentSize = 0
    const children = this.getChildren()
    const childrenLength = children.length
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i]
      textContentSize += child.getTextContentSize()
      if (
        $isElementNode(child) &&
        i !== childrenLength - 1 &&
        !child.isInline()
      ) {
        textContentSize += DOUBLE_LINE_BREAK.length
      }
    }

    return textContentSize
  }
  getDirection(): 'ltr' | 'rtl' | null {
    const self = this.getLatest()
    return self.__dir
  }
  hasFormat(type: ElementFormatType): boolean {
    if (type !== '') {
      const formatFlag = ELEMENT_TYPE_TO_FORMAT[type]
      return (this.getFormat() & formatFlag) !== 0
    }
    return false
  }

  //
  // Mutators
  //

  /**
   * 현재 노드를 선택하고 RangeSelection 을 반환합니다.
   *
   * @param _anchorOffset - 앵커 포인트의 오프셋 (선택적)
   * @param _focusOffset - 포커스 포인트의 오프셋 (선택적)
   * @returns 생성된 또는 업데이트된 RangeSelection
   *
   * @description
   * 1. 읽기 전용 모드 체크
   * 2. 빈 노드 불가능한 경우의 특별 처리
   * 3. 오프셋 기본값 설정
   * 4. 새 RangeSelection 생성 또는 기존 선택 업데이트
   */
  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
    errorOnReadOnly()
    const selection = $getSelection()
    let anchorOffset = _anchorOffset
    let focusOffset = _focusOffset
    const childrenCount = this.getChildrenSize()

    if (!this.canBeEmpty()) {
      // 선택이 노드의 시작일 경우
      if (_anchorOffset === 0 && _focusOffset === 0) {
        const firstChild = this.getFirstChild()
        if ($isTextNode(firstChild) || $isElementNode(firstChild)) {
          return firstChild.select(0, 0)
        }
        // 선택이 노드의 끝일 경우
      } else if (
        (_anchorOffset === undefined || _anchorOffset === childrenCount) &&
        (_focusOffset === undefined || _focusOffset === childrenCount)
      ) {
        const lastChild = this.getLastChild()
        if ($isTextNode(lastChild) || $isElementNode(lastChild)) {
          return lastChild.select()
        }
      }
    }
    if (anchorOffset === undefined) {
      anchorOffset = childrenCount
    }
    if (focusOffset === undefined) {
      focusOffset = childrenCount
    }
    const key = this.__key
    if (!$isRangeSelection(selection)) {
      return $internalMakeRangeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'element',
        'element',
      )
    } else {
      selection.anchor.set(key, anchorOffset, 'element')
      selection.focus.set(key, focusOffset, 'element')
      selection.dirty = true
    }

    return selection
  }
  // selectStart(): RangeSelection {
  //   const firstNode = this.getFirstDescendant()
  //   return firstNode ? firstNode.selectS
  // }
  append(..._nodesToAppend: LexicalNode[]): this {
    return this
  }
  canBeEmpty(): boolean {
    return true
  }
  isShadowRoot(): boolean {
    return false
  }
}

export function $isElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return node instanceof ElementNode
}

function isPointRemoved(
  point: PointType,
  nodesToRemoveKeySet: Set<NodeKey>,
  nodesToInsertKeySet: Set<NodeKey>,
): boolean {
  const node: ElementNode | TextNode | null = point.getNode()

  while (node) {
    const nodeKey = node.__key
    if (nodesToRemoveKeySet.has(nodeKey) && !nodesToInsertKeySet.has(nodeKey)) {
      return true
    }
  }

  return false
}

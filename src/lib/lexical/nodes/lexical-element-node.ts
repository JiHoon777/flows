import type {
  NodeKey,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type {
  BaseSelection,
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
  moveSelectionPointToSibling,
} from '@/lib/lexical/lexical-selection.ts'
import {
  errorOnReadOnly,
  getActiveEditor,
} from '@/lib/lexical/lexical-updates.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'
import { $isRootOrShadowRoot, removeFromParent } from '../lexical-utils'

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
  selectStart(): RangeSelection {
    const firstNode = this.getFirstDescendant()
    return firstNode ? firstNode.selectStart() : this.select()
  }
  selectEnd(): RangeSelection {
    const lastNode = this.getLastDescendant()
    return lastNode ? lastNode.selectEnd() : this.select()
  }
  clear(): this {
    const writableSelf = this.getWritable()
    const children = this.getChildren()
    children.forEach((child) => child.remove())
    return writableSelf
  }
  append(...nodesToAppend: LexicalNode[]): this {
    return this.splice(this.getChildrenSize(), 0, nodesToAppend)
  }
  setDirection(direction: 'ltr' | 'rtl' | null): this {
    const self = this.getWritable()
    self.__dir = direction
    return self
  }
  setFormat(type: ElementFormatType): this {
    const self = this.getWritable()
    self.__format = type !== '' ? ELEMENT_TYPE_TO_FORMAT[type] : 0
    return this
  }
  setStyle(style: string): this {
    const self = this.getWritable()
    self.__style = style || ''
    return this
  }
  setIndent(indentLevel: number): this {
    const self = this.getWritable()
    self.__indent = indentLevel
    return this
  }
  /**
   * 자식 노드 배열을 수정합니다. 지정된 위치에서 노드를 제거하고 새 노드를 삽입합니다.
   *
   * @param start - 변경을 시작할 인덱스
   * @param deleteCount - 제거할 노드의 수
   * @param nodesToInsert - 삽입할 새 노드들의 배열
   * @returns 수정된 현재 노드
   *
   * @description
   * 이 메서드는 배열의 splice 메서드와 유사하게 작동하며, 자식 노드들을 수정합니다:
   * 1. 지정된 start 인덱스부터 deleteCount만큼의 노드를 제거합니다.
   * 2. 제거된 위치에 nodesToInsert의 노드들을 삽입합니다.
   * 3. 노드 간의 연결(prev, next)을 적절히 조정합니다.
   * 4. 부모-자식 관계를 업데이트합니다.
   * 5. 선택 영역을 조정합니다(노드가 제거된 경우).
   *
   * @throws
   * - 'splice: sibling not found': 삭제할 노드를 찾을 수 없는 경우
   * - 'append: attempting to append self': 자기 자신을 자식으로 추가하려는 경우
   *
   * @notes
   * - 이 메서드는 노드의 쓰기 가능한 버전을 반환합니다.
   * - 노드가 비어있을 수 없는 경우, 모든 자식이 제거되면 이 노드도 제거됩니다.
   * - 선택 영역이 제거되는 노드에 있었다면, 적절히 조정됩니다.
   *
   * @example
   * const parent = $createParagraphNode();
   * const child1 = $createTextNode("Hello");
   * const child2 = $createTextNode("World");
   * parent.append(child1, child2);
   * const newChild = $createTextNode("Lexical");
   * parent.splice(1, 1, [newChild]);
   * // 결과: parent의 자식은 [child1, newChild]가 됩니다.
   */
  splice(
    start: number,
    deleteCount: number,
    nodesToInsert: Array<LexicalNode>,
  ): this {
    const nodesToInsertLength = nodesToInsert.length
    const oldSize = this.getChildrenSize()
    const writableSelf = this.getWritable()
    const writableSelfKey = writableSelf.__key
    const nodesToInsertKeys = []
    const nodesToRemoveKeys = []
    const nodeAfterRange = this.getChildAtIndex(start + deleteCount)
    let nodeBeforeRange = null
    let newSize = oldSize - deleteCount + nodesToInsertLength

    if (start !== 0) {
      if (start === oldSize) {
        nodeBeforeRange = this.getLastChild()
      } else {
        const node = this.getChildAtIndex(start)
        if (node !== null) {
          nodeBeforeRange = node.getPreviousSibling()
        }
      }
    }

    if (deleteCount > 0) {
      let nodeToDelete =
        nodeBeforeRange === null
          ? this.getFirstChild()
          : nodeBeforeRange.getNextSibling()
      for (let i = 0; i < deleteCount; i++) {
        if (nodeToDelete === null) {
          invariant(false, 'splice: sibling not found')
        }
        const nextSibling = nodeToDelete.getNextSibling()
        const nodeKeyToDelete = nodeToDelete.__key
        const writableNodeToDelete = nodeToDelete.getWritable()
        removeFromParent(writableNodeToDelete)
        nodesToRemoveKeys.push(nodeKeyToDelete)
        nodeToDelete = nextSibling
      }
    }

    let prevNode = nodeBeforeRange
    for (let i = 0; i < nodesToInsertLength; i++) {
      const nodeToInsert = nodesToInsert[i]
      if (prevNode !== null && nodeToInsert.is(prevNode)) {
        nodeBeforeRange = prevNode = prevNode.getPreviousSibling()
      }
      const writableNodeToInsert = nodeToInsert.getWritable()
      if (writableNodeToInsert.__parent === writableSelfKey) {
        newSize--
      }
      removeFromParent(writableNodeToInsert)
      const nodeKeyToInsert = nodeToInsert.__key
      if (prevNode === null) {
        writableSelf.__first = nodeKeyToInsert
        writableNodeToInsert.__prev = null
      } else {
        const writablePrevNode = prevNode.getWritable()
        writablePrevNode.__next = nodeKeyToInsert
        writableNodeToInsert.__prev = writablePrevNode.__key
      }
      if (nodeToInsert.__key === writableSelfKey) {
        invariant(false, 'append: attempting to append self')
      }
      // Set child parent to self
      writableNodeToInsert.__parent = writableSelfKey
      nodesToInsertKeys.push(nodeKeyToInsert)
      prevNode = nodeToInsert
    }

    if (start + deleteCount === oldSize) {
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable()
        writablePrevNode.__next = null
        writableSelf.__last = prevNode.__key
      }
    } else if (nodeAfterRange !== null) {
      const writableNodeAfterRange = nodeAfterRange.getWritable()
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable()
        writableNodeAfterRange.__prev = prevNode.__key
        writablePrevNode.__next = nodeAfterRange.__key
      } else {
        writableNodeAfterRange.__prev = null
      }
    }

    writableSelf.__size = newSize

    // In case of deletion we need to adjust selection, unlink removed nodes
    // and clean up node itself if it becomes empty. None of these needed
    // for insertion-only cases
    if (nodesToRemoveKeys.length) {
      // Adjusting selection, in case node that was anchor/focus will be deleted
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const nodesToRemoveKeySet = new Set(nodesToRemoveKeys)
        const nodesToInsertKeySet = new Set(nodesToInsertKeys)

        const { anchor, focus } = selection
        if (isPointRemoved(anchor, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(
            anchor,
            anchor.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          )
        }
        if (isPointRemoved(focus, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(
            focus,
            focus.getNode(),
            this,
            nodeBeforeRange,
            nodeAfterRange,
          )
        }
        // Cleanup if node can't be empty
        if (newSize === 0 && !this.canBeEmpty() && !$isRootOrShadowRoot(this)) {
          this.remove()
        }
      }
    }

    return writableSelf
  }
  // JSON serialization
  exportJSON(): SerializedElementNode {
    return {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      type: 'element',
      version: 1,
    }
  }
  /**
   * 현재 요소 다음에 새로운 노드를 삽입합니다.
   * 이 메서드는 특정 요소의 휴리스틱을 위해 확장되도록 설계되었습니다.
   *
   * @param selection - 현재 선택 영역 (RangeSelection)
   * @param restoreSelection - 선택 영역을 복원할지 여부 (선택적)
   * @returns 삽입된 새 노드 또는 null (삽입이 수행되지 않은 경우)
   *
   * @description
   * 이 메서드는 기본적으로 아무 동작도 수행하지 않으며, null을 반환합니다.
   * 특정 요소 타입에 대한 고유한 삽입 로직을 구현하기 위해
   * 하위 클래스에서 재정의되어야 합니다.
   *
   * @example
   * class CustomParagraphNode extends ElementNode {
   *   insertNewAfter(selection: RangeSelection, restoreSelection = true): LexicalNode | null {
   *     const newElement = $createParagraphNode();
   *     this.insertAfter(newElement, restoreSelection);
   *     return newElement;
   *   }
   * }
   *
   * @note
   * - 이 메서드의 구체적인 구현은 요소의 특성과 에디터의 요구사항에 따라 달라질 수 있습니다.
   * - 선택 영역 처리, 새 노드의 포커스 설정 등의 로직을 포함할 수 있습니다.
   */
  insertNewAfter(
    _selection: RangeSelection,
    _restoreSelection?: boolean,
  ): null | LexicalNode {
    return null
  }
  canIndent(): boolean {
    return true
  }
  /**
   * 노드의 시작 부분에서 선택 영역이 있을 때 뒤로 삭제(백스페이스) 동작을 제어합니다.
   *
   * @param selection - 현재 선택 영역 (RangeSelection)
   * @returns 노드가 축소되었으면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 선택 영역이 노드의 시작 부분(오프셋 0)에 있을 때
   * 백스페이스 키 입력에 대한 노드의 동작을 정의합니다.
   * 기본 구현은 false를 반환하여 기본 동작을 유지합니다.
   */
  collapseAtStart(_selection: RangeSelection): boolean {
    return false
  }
  /**
   * 노드를 복사 작업에서 제외할지 여부를 결정합니다.
   *
   * @param destination - 복사 대상 ('clone' 또는 'html')
   * @returns 노드를 복사에서 제외하려면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 노드가 클립보드로 복사되거나 HTML로 내보내질 때
   * 해당 노드를 제외할지 결정합니다.
   * 기본 구현은 false를 반환하여 모든 복사 작업에 노드를 포함시킵니다.
   */
  excludeFromCopy(_destination?: 'clone' | 'html'): boolean {
    return false
  }
  /**
   * @deprecated
   * @internal
   *
   * 이 노드를 다른 노드로 대체할 수 있는지 확인합니다.
   *
   * @param replacement - 대체할 노드
   * @returns 대체 가능하면 true, 그렇지 않으면 false
   */
  canReplaceWith(_replacement: LexicalNode): boolean {
    return true
  }
  /**
   * @deprecated
   * @internal
   *
   * 주어진 노드를 이 노드 뒤에 삽입할 수 있는지 확인합니다.
   *
   * @param node - 삽입할 노드
   * @returns 삽입 가능하면 true, 그렇지 않으면 false
   */
  canInsertAfter(_node: LexicalNode): boolean {
    return true
  }
  /**
   * 노드가 비어있을 수 있는지 여부를 결정합니다.
   *
   * @returns 노드가 비어있을 수 있으면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 노드가 자식 없이 존재할 수 있는지를 결정합니다.
   * 기본 구현은 true를 반환하여 노드가 비어있을 수 있음을 나타냅니다.
   */
  canBeEmpty(): boolean {
    return true
  }
  /**
   * 노드 앞에 텍스트를 삽입할 수 있는지 여부를 결정합니다.
   *
   * @returns 노드 앞에 텍스트 삽입이 가능하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 노드 바로 앞에 텍스트를 삽입할 수 있는지를 결정합니다.
   * 기본 구현은 true를 반환하여 텍스트 삽입을 허용합니다.
   */
  canInsertTextBefore(): boolean {
    return true
  }
  /**
   * 노드 뒤에 텍스트를 삽입할 수 있는지 여부를 결정합니다.
   *
   * @returns 노드 뒤에 텍스트 삽입이 가능하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 노드 바로 뒤에 텍스트를 삽입할 수 있는지를 결정합니다.
   * 기본 구현은 true를 반환하여 텍스트 삽입을 허용합니다.
   */
  canInsertTextAfter(): boolean {
    return true
  }
  /**
   * 노드가 인라인 요소인지 여부를 결정합니다.
   *
   * @returns 노드가 인라인 요소이면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 노드가 인라인 레벨 요소인지 블록 레벨 요소인지를 결정합니다.
   * 기본 구현은 false를 반환하여 노드가 블록 레벨 요소임을 나타냅니다.
   */
  isInline(): boolean {
    return false
  }
  /**
   * 노드가 섀도우 루트인지 여부를 결정합니다.
   *
   * @returns 노드가 섀도우 루트이면 true, 그렇지 않으면 false
   *
   * @description
   * 섀도우 루트는 RootNode와 유사하게 동작하는 노드입니다.
   * 섀도우 루트(및 RootNode)는 계층 구조의 끝을 표시합니다.
   * 대부분의 구현에서는 이 지점 위로 더 이상 아무것도 없는 것처럼 취급해야 합니다.
   * 예를 들어, TableCellNode 내부에서 수행된 node.getTopLevelElement()는
   * RootNode 대신 TableCellNode 바로 아래의 첫 번째 자식을 반환합니다.
   *
   * 기본 구현은 false를 반환하여 노드가 섀도우 루트가 아님을 나타냅니다.
   */
  isShadowRoot(): boolean {
    return false
  }

  /**
   * @deprecated
   * @internal
   *
   * 이 노드를 다른 ElementNode와 병합할 수 있는지 확인합니다.
   *
   * @param node - 병합 대상 노드
   * @returns 병합 가능하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 더 이상 사용되지 않으며 내부용입니다.
   * 기본 구현은 false를 반환하여 병합을 허용하지 않습니다.
   */
  canMergeWith(_node: ElementNode): boolean {
    return false
  }
  /**
   * 특정 자식 노드와 함께 이 노드를 추출할 수 있는지 확인합니다.
   *
   * @param child - 추출하려는 자식 노드
   * @param selection - 현재 선택 영역 (또는 null)
   * @param destination - 추출 대상 ('clone' 또는 'html')
   * @returns 추출 가능하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 특정 자식 노드와 함께 이 노드를 복사하거나 HTML로 내보낼 때
   * 추출 가능한지를 결정합니다. 이는 복사/붙여넣기 또는 HTML 내보내기 작업 중
   * 노드의 동작을 제어하는 데 사용됩니다.
   *
   * 기본 구현은 false를 반환하여 추출을 허용하지 않습니다.
   */
  extractWithChild(
    _child: LexicalNode,
    _selection: BaseSelection | null,
    _destination: 'clone' | 'html',
  ): boolean {
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

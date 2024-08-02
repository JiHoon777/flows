import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type {
  EditorConfig,
  LexicalEditor,
} from '@/lib/lexical/lexical-editor.ts'
import type {
  BaseSelection,
  RangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import type { Klass, KlassConstructor } from '@/lib/lexical/lexical-type.ts'
import type { DecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

import { HAS_DIRTY_NODES } from '@/lib/lexical/lexical-constants.ts'
import {
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $updateElementSelectionOnCreateDeleteNode,
  moveSelectionPointToSibling,
} from '@/lib/lexical/lexical-selection.ts'
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
} from '@/lib/lexical/lexical-updates.ts'
import {
  $cloneWithProperties,
  $getCompositionKey,
  $isRootOrShadowRoot,
  $maybeMoveChildrenSelectionToParent,
  $moveSelectionPointToEnd,
  $setCompositionKey,
  $setSelection,
  errorOnInsertTextNodeOnRoot,
  errorOnNodeKeyConstructorMismatch,
  generateRandomKey,
  internalMarkNodeAsDirty,
  removeFromParent,
} from '@/lib/lexical/lexical-utils.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $createParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'

export type NodeKey = string
export type NodeMap = Map<NodeKey, LexicalNode>

export type SerializedLexicalNode = {
  type: string
  version: number
}

export type DOMConversion<T extends HTMLElement = HTMLElement> = {
  conversion: DOMConversionFn<T>
  priority?: 0 | 1 | 2 | 3 | 4
}
export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (
  element: T,
) => DOMConversionOutput | null

export type DOMChildConversion = (
  lexicalNode: LexicalNode,
  parentLexicalNode: LexicalNode | null | undefined,
) => LexicalNode | null | undefined

export type NodeName = string
export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<
  NodeName,
  (node: T) => DOMConversion<T> | null
>

export type DOMConversionOutput = {
  after?: (childLexicalNodes: LexicalNode[]) => LexicalNode[]
  forChild?: DOMChildConversion
  node: null | LexicalNode | LexicalNode[]
}

export type DOMExportOutput = {
  after?: (
    generatedElement: HTMLElement | Text | null | undefined,
  ) => HTMLElement | Text | null | undefined
  element: HTMLElement | Text | null
}

/**
 * 주어진 키로 노드를 가져오는 함수
 *
 * @param key - 찾고자 하는 노드의 키
 * @param _editorState - 에디터 상태 (선택적)
 * @returns 찾은 노드 또는 null
 *
 * @description
 * 이 함수는 주어진 키를 사용하여 에디터 상태에서 특정 노드를 검색합니다.
 * 주요 동작:
 * 1. 활성 에디터 상태 확인
 * 2. 노드맵에서 키로 노드 검색
 * 3. 노드가 없으면 null 반환, 있으면 해당 노드 반환
 */
export function $getNodeByKey<T extends LexicalNode>(
  key: NodeKey,
  _editorState?: EditorState,
): T | null {
  const editorState = _editorState || getActiveEditorState()
  const node = editorState._nodeMap.get(key) as T
  if (node === undefined) {
    return null
  }

  return node
}

/**
 * 노드에 키를 설정하는 함수
 *
 * @param node - 키를 설정할 노드
 * @param existingKey - 기존 키 (있는 경우)
 *
 * @description
 * 이 함수는 주어진 노드에 키를 설정합니다. 새 키를 생성하거나 기존 키를 사용합니다.
 * 주요 동작:
 * 1. 기존 키가 있으면 검증 후 설정
 * 2. 읽기 전용 모드 및 무한 변환 체크
 * 3. 새 키 생성 및 노드맵에 설정
 * 4. 엘리먼트 노드와 리프 노드 구분하여 더티 플래그 설정
 * 5. 클론 불필요 표시 및 더티 타입 설정
 * 6. 노드에 키 할당
 */
export function $setNodeKey(
  node: LexicalNode,
  existingKey: NodeKey | null | undefined,
): void {
  if (existingKey != null) {
    if (__DEV__) {
      errorOnNodeKeyConstructorMismatch(node, existingKey)
    }
    node.__key = existingKey
    return
  }
  errorOnReadOnly()
  errorOnInfiniteTransforms()

  const editor = getActiveEditor()
  const editorState = getActiveEditorState()
  const key = generateRandomKey()
  editorState._nodeMap.set(key, node)
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true)
  } else {
    editor._dirtyLeaves.add(key)
  }

  editor._cloneNotNeeded.add(key)
  editor._dirtyType = HAS_DIRTY_NODES
  node.__key = key
}

/**
 * 노드를 제거하는 함수
 *
 * @param nodeToRemove - 제거할 노드
 * @param restoreSelection - 선택 영역 복원 여부
 * @param preserveEmptyParent - 빈 부모 노드 보존 여부 (선택적)
 *
 * @description
 * 이 함수는 Lexical 에디터에서 특정 노드를 제거하고, 필요에 따라 선택 영역을 조정합니다.
 * 주요 동작:
 * 1. 읽기 전용 모드 체크
 * 2. 부모 노드 확인
 * 3. 자식 노드들의 선택 영역을 부모로 이동 (필요시)
 * 4. 범위 선택(RangeSelection)일 경우 선택 포인트 조정
 * 5. 노드 선택(NodeSelection)일 경우 이전 노드 선택
 * 6. 노드 제거 및 선택 영역 업데이트
 * 7. 빈 부모 노드 처리 (옵션에 따라)
 * 8. 루트 노드가 비었을 경우 끝 선택
 */
export function $removeNode(
  nodeToRemove: LexicalNode,
  restoreSelection: boolean,
  preserveEmptyParent?: boolean,
): void {
  errorOnReadOnly()
  const key = nodeToRemove.__key
  const parent = nodeToRemove.getParent()

  if (parent === null) {
    return
  }

  const selection = $maybeMoveChildrenSelectionToParent(nodeToRemove)
  let selectionMoved = false
  if ($isRangeSelection(selection) && restoreSelection) {
    const anchor = selection.anchor
    const focus = selection.focus
    if (anchor.key === key) {
      moveSelectionPointToSibling(
        anchor,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      )
      selectionMoved = true
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(
        focus,
        nodeToRemove,
        parent,
        nodeToRemove.getPreviousSibling(),
        nodeToRemove.getNextSibling(),
      )
      selectionMoved = true
    }
  } else if (
    $isNodeSelection(selection) &&
    restoreSelection &&
    nodeToRemove.isSelected()
  ) {
    nodeToRemove.selectPrevious()
  }

  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    // Doing this is O(n) so lets avoid it unless we need to do it
    const index = nodeToRemove.getIndexWithinParent()
    removeFromParent(nodeToRemove)
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1)
  } else {
    removeFromParent(nodeToRemove)
  }

  if (
    !preserveEmptyParent &&
    !$isRootOrShadowRoot(parent) &&
    !parent.canBeEmpty() &&
    parent.isEmpty()
  ) {
    $removeNode(parent, restoreSelection)
  }
  if (restoreSelection && $isRootNode(parent) && parent.isEmpty()) {
    parent.selectEnd()
  }
}

export class LexicalNode {
  // 정적 속성을 포함한 타입을 조회할 수 있도록 합니다.
  declare ['constructor']: KlassConstructor<typeof LexicalNode>
  /** @internal */
  __type: string
  /** @internal */
  __key!: string
  /** @internal */
  __parent: null | NodeKey
  /** @internal */
  __prev: null | NodeKey
  /** @internal */
  __next: null | NodeKey

  // 안타깝게도 Flow 는 추상 클래스를 지원하지 않기 때문에, Node 의 하위 클래스에 정적 메서드 구현을 강제할 수 없습니다.
  // 그러나 Node 의 모든 하위 클래스는 정적 getType 메서드와 clone 메서드를 가져야 합니다.
  // 우리는 여기서 getType 과 clone 을 정의하여 모든 Node 에서 이를 호출할 수 있게 합니다.
  // 그리고 기본적으로 이 에러를 발생시킵니다. 왜냐하면 하위 클래스가 자체적으로 이 메서드들을 구현해야 하기 때문입니다.
  /**
   * 이 메서드는 노드의 문자열 타입을 반환합니다.
   * 모든 노드는 이 메서드를 반드시 구현해야 하며, 에디터에 등록된 노드들 사이에서 반드시 고유해야 합니다.
   */
  static getType(): string {
    invariant(
      false,
      `LexicalNode: Node %s does not implement .getType().`,
      this.name,
    )
  }

  /**
   * 이 노드를 복제하여 다른 키를 가진 새로운 노드를 생성하고 EditorState 에 추가합니다
   * (그러나 어디에도 연결하지 않습니다!).
   * 모든 노드는 이 메서드를 반드시 구현해야 합니다.
   *
   */
  static clone(_data: unknown): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .clone().',
      this.name,
    )
  }

  static importDOM?: () => DOMConversionMap<any> | null

  constructor(key?: NodeKey) {
    this.__type = this.constructor.getType()
    this.__parent = null
    this.__prev = null
    this.__next = null
    $setNodeKey(this, key)

    if (__DEV__) {
      if (this.__type !== 'root') {
        errorOnReadOnly()
        errorOnTypeKlassMismatch(this.__type, this.constructor)
      }
    }
  }

  // Getters and Traversers

  /**
   * Returns the string type of this node.
   */
  getType(): string {
    return this.__type
  }

  isInline(): boolean {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .isInline().',
      this.constructor.name,
    )
  }

  /**
   * 이 노드와 RootNode 사이에 경로가 있으면 true 를, 그렇지 않으면 false 를 반환합니다.
   * 이는 노드가 EditorState 에 '연결되어 있는지' 판단하는 방법입니다. 연결되지 않은 노드들은
   * 조정(reconcile)되지 않으며, 최종적으로 Lexical 의 가비지 컬렉터(GC)에 의해 정리될 것입니다.
   */
  isAttached(): boolean {
    let nodeKey: string | null = this.__key
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true
      }

      const node: LexicalNode | null = $getNodeByKey(nodeKey)

      if (node === null) {
        break
      }
      nodeKey = node.__parent
    }

    return false
  }

  /**
   * 이 노드가 제공된 Selection 내에 포함되어 있으면 true 를, 그렇지 않으면 false 를 반환합니다.
   * 무엇이 포함되는지 결정하기 위해 {@link BaseSelection.getNodes}에 구현된 알고리즘에 의존합니다.
   *
   * @param selection - 노드가 포함되어 있는지 확인하고자 하는 선택 영역입니다."
   */
  isSelected(selection?: null | BaseSelection): boolean {
    const targetSelection = selection || $getSelection()
    if (targetSelection == null) {
      return false
    }

    const isSelected = targetSelection
      .getNodes()
      .some((n) => n.__key === this.__key)

    if ($isTextNode(this)) {
      return isSelected
    }

    // 요소 노드 내부의 인라인 이미지를 위한 것입니다.
    // 이 변경 사항이 없으면 커서가 이미지 앞이나 뒤에 있을 때 이미지가 선택됩니다.
    const isElementRangeSelection =
      $isRangeSelection(targetSelection) &&
      targetSelection.anchor.type === 'element' &&
      targetSelection.focus.type === 'element'

    if (isElementRangeSelection) {
      if (targetSelection.isCollapsed()) {
        return false
      }

      const parentNode = this.getParent()
      if ($isDecoratorNode(this) && this.isInline() && parentNode) {
        const { anchor, focus } = targetSelection

        if (anchor.isBefore(focus)) {
          const anchorNode = anchor.getNode() as ElementNode
          const isAnchorPointToLast =
            anchor.offset === anchorNode.getChildrenSize()
          const isAnchorNodeIsParent = anchorNode.is(parentNode)
          const isLastChild = anchorNode.getLastChildOrThrow().is(this)

          if (isAnchorPointToLast && isAnchorNodeIsParent && isLastChild) {
            return false
          }
        } else {
          const focusNode = focus.getNode() as ElementNode
          const isFocusPointToLast =
            focus.offset === focusNode.getChildrenSize()
          const isFocusNodeIsParent = focusNode.is(parentNode)
          const isLastChild = focusNode.getLastChildOrThrow().is(this)
          if (isFocusPointToLast && isFocusNodeIsParent && isLastChild) {
            return false
          }
        }
      }
    }

    return isSelected
  }

  /**
   * Returns this nodes key.
   */
  getKey(): NodeKey {
    // Key is stable between copies
    return this.__key
  }
  /**
   * 부모 노드 내에서 이 노드의 0부터 시작하는 인덱스를 반환합니다.
   *
   * @returns 노드의 인덱스, 부모가 없거나 찾지 못한 경우 -1
   *
   * @description
   * 1. 부모 노드를 확인합니다.
   * 2. 부모의 첫 번째 자식부터 시작하여 순차적으로 검사합니다.
   * 3. 현재 노드와 일치하는 자식을 찾으면 그 인덱스를 반환합니다.
   * 4. 모든 자식을 검사한 후에도 찾지 못하면 -1을 반환합니다.
   */
  getIndexWithinParent(): number {
    const parent = this.getParent()
    if (parent === null) {
      return -1
    }
    let node = parent.getFirstChild()
    let index = 0
    while (node !== null) {
      if (this.is(node)) {
        return index
      }
      index++
      node = node.getNextSibling()
    }
    return -1
  }
  /**
   * Returns the parent of this node, or null if none is found.
   */
  getParent<T extends ElementNode>(): T | null {
    const parent = this.getLatest().__parent
    if (parent === null) {
      return null
    }
    return $getNodeByKey<T>(parent)
  }
  /**
   * Returns the parent of this node, or throws if none is found.
   */
  getParentOrThrow<T extends ElementNode>(): T {
    const parent = this.getParent<T>()
    if (parent === null) {
      invariant(false, 'Expected node %s to have a parent.', this.__key)
    }
    return parent
  }
  /**
   * 이 노드의 최상위 비루트 조상 노드를 반환합니다.
   *
   * @returns ElementNode, DecoratorNode, 또는 null
   *
   * @description
   * 1. 현재 노드부터 시작하여 부모 노드를 따라 트리를 거슬러 올라갑니다.
   * 2. 루트 또는 섀도우 루트 바로 아래의 노드를 찾습니다.
   * 3. 찾은 노드가 ElementNode 또는 DecoratorNode 인지 확인합니다.
   * 4. 조건을 만족하는 노드를 찾지 못하면 null 을 반환합니다.
   */
  getTopLevelElement(): ElementNode | DecoratorNode<unknown> | null {
    let node: ElementNode | this | null = this
    while (node !== null) {
      const parent: ElementNode | null = node.getParent()
      if ($isRootOrShadowRoot(parent)) {
        invariant(
          $isElementNode(node) || (node === this && $isDecoratorNode(node)),
          'Children of root nodes must be elements or decorators',
        )
        return node
      }

      node = parent
    }
    return null
  }
  getTopLevelElementOrThrow(): ElementNode | DecoratorNode<unknown> {
    const parent = this.getTopLevelElement()
    if (parent === null) {
      invariant(
        false,
        'Expected node %s to have a top parent element.',
        this.__key,
      )
    }
    return parent
  }
  /**
   * 이 노드의 모든 조상을 RootNode 까지 반환합니다.
   */
  getParents(): Array<ElementNode> {
    const parents: Array<ElementNode> = []
    let node = this.getParent()
    while (node !== null) {
      parents.push(node)
      node = node.getParent()
    }
    return parents
  }
  getParentKeys(): Array<NodeKey> {
    const parents: Array<NodeKey> = []
    let node = this.getParent()
    while (node !== null) {
      parents.push(node.__key)
      node = node.getParent()
    }
    return parents
  }
  /**
   * Returns the "previous" siblings - that is, the node that comes
   * before this one in the same parent.
   *
   */
  getPreviousSibling<T extends LexicalNode>(): T | null {
    const self = this.getLatest()
    const prevKey = self.__prev
    return prevKey === null ? null : $getNodeByKey<T>(prevKey)
  }
  /**
   * Returns the "previous" siblings - that is, the nodes that come between
   * this one and the first child of it's parent, inclusive.
   *
   */
  getPreviousSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = []
    const parent = this.getParent()
    if (parent === null) {
      return siblings
    }
    let node: null | T = parent.getFirstChild()
    while (node !== null) {
      if (node.is(this)) {
        break
      }
      siblings.push(node)
      node = node.getNextSibling()
    }
    return siblings
  }
  /**
   * "다음" 형제 노드를 반환합니다. 즉, 동일한 부모 내에서 이 노드 다음에 오는 노드입니다.
   *
   */
  getNextSibling<T extends LexicalNode>(): T | null {
    const self = this.getLatest()
    const nextKey = self.__next
    return nextKey === null ? null : $getNodeByKey<T>(nextKey)
  }
  /**
   * 이 노드 이후의 모든 형제 노드를 반환합니다.
   *
   */
  getNextSiblings<T extends LexicalNode>(): Array<T> {
    const siblings: Array<T> = []
    let node: null | T = this.getNextSibling()
    while (node !== null) {
      siblings.push(node)
      node = node.getNextSibling()
    }
    return siblings
  }
  /**
   * 이 노드와 제공된 노드의 가장 가까운 공통 조상을 반환하거나,
   * 찾을 수 없는 경우 null 을 반환합니다.
   *
   * @param node - 공통 조상을 찾을 다른 노드.
   */
  getCommonAncestor<T extends ElementNode = ElementNode>(
    node: LexicalNode,
  ): T | null {
    const a = this.getParents()
    const b = node.getParents()
    if ($isElementNode(this)) {
      a.unshift(this)
    }
    if ($isElementNode(node)) {
      b.unshift(node)
    }
    const aLength = a.length
    const bLength = b.length
    if (aLength === 0 || bLength === 0 || a[aLength - 1] !== b[bLength - 1]) {
      return null
    }
    const bSet = new Set(b)
    for (let i = 0; i < aLength; i++) {
      const ancestor = a[i] as T
      if (bSet.has(ancestor)) {
        return ancestor
      }
    }
    return null
  }
  /**
   * 제공된 노드가 Lexical 의 관점에서 이 노드와 정확히 동일한 노드인 경우 true 를 반환합니다.
   * 항상 참조 동등성 대신 이 메서드를 사용하십시오.
   *
   * @param {Node} object - 동등성 비교를 수행할 노드.
   * @returns {boolean} - 노드가 동일한 것으로 간주되면 true, 그렇지 않으면 false.
   */
  is(object: LexicalNode | null | undefined): boolean {
    if (object == null) {
      return false
    }

    return this.__key === object.__key
  }
  /**
   * 이 노드가 편집기 상태에서 대상 노드를 논리적으로 선행하는 경우 true 를 반환합니다.
   *
   * @param targetNode - 이 노드 뒤에 있는지 테스트하려는 노드입니다.
   */
  isBefore(targetNode: LexicalNode): boolean {
    if (this === targetNode) {
      return false
    }
    if (targetNode.isParentOf(this)) {
      return true
    }
    if (this.isParentOf(targetNode)) {
      return false
    }
    const commonAncestor = this.getCommonAncestor(targetNode)
    let indexA = 0
    let indexB = 0
    let node: this | ElementNode | LexicalNode = this
    while (true) {
      const parent: ElementNode = node.getParentOrThrow()
      if (parent === commonAncestor) {
        indexA = node.getIndexWithinParent()
        break
      }
      node = parent
    }
    node = targetNode
    while (true) {
      const parent: ElementNode = node.getParentOrThrow()
      if (parent === commonAncestor) {
        indexB = node.getIndexWithinParent()
        break
      }
      node = parent
    }
    return indexA < indexB
  }
  /**
   * 이 노드가 대상 노드의 부모인 경우 true 를 반환하고, 그렇지 않으면 false 를 반환합니다.
   *
   * @param targetNode - 자식 노드로 간주될 노드입니다.
   */
  isParentOf(targetNode: LexicalNode): boolean {
    const key = this.__key
    if (key === targetNode.__key) {
      return false
    }
    let node: ElementNode | LexicalNode | null = targetNode
    while (node !== null) {
      if (node.__key === key) {
        return true
      }
      node = node.getParent()
    }
    return false
  }
  /**
   * EditorState 에서 이 노드와 대상 노드 사이에 있는 노드들의 목록을 반환합니다.
   *
   * @param targetNode - 반환될 노드 범위의 다른 끝을 표시하는 노드입니다.
   */
  getNodesBetween(targetNode: LexicalNode): Array<LexicalNode> {
    const isBefore = this.isBefore(targetNode)
    const nodes: Array<LexicalNode> = []
    const visited = new Set<NodeKey>()
    let node: LexicalNode | this | null = this
    while (true) {
      if (node === null) {
        break
      }
      const key = node.__key
      if (!visited.has(key)) {
        visited.add(key)
        nodes.push(node)
      }
      // targetNode 에 도달하면 반복 종료
      if (node === targetNode) {
        break
      }
      // ElementNode 인 경우 자식 노드로 이동
      const child: LexicalNode | null = $isElementNode(node)
        ? isBefore
          ? node.getFirstChild()
          : node.getLastChild()
        : null
      if (child !== null) {
        node = child
        continue
      }

      // 형제 노드로 이동
      const nextSibling: LexicalNode | null = isBefore
        ? node.getNextSibling()
        : node.getPreviousSibling()
      if (nextSibling !== null) {
        node = nextSibling
        continue
      }

      // 부모 노드로 이동
      const parent: LexicalNode = node.getParentOrThrow()
      if (!visited.has(parent.__key)) {
        nodes.push(parent)
      }
      if (parent === targetNode) {
        break
      }

      // 부모의 형제 노드를 찾아 올라감
      let parentSibling = null
      let ancestor: LexicalNode | null = parent
      do {
        if (ancestor === null) {
          invariant(false, 'getNodesBetween: ancestor is null')
        }
        parentSibling = isBefore
          ? ancestor.getNextSibling()
          : ancestor.getPreviousSibling()
        ancestor = ancestor.getParent()
        if (ancestor !== null) {
          if (parentSibling === null && !visited.has(ancestor.__key)) {
            nodes.push(ancestor)
          }
        } else {
          break
        }
      } while (parentSibling === null)
      node = parentSibling
    }

    if (!isBefore) {
      nodes.reverse()
    }
    return nodes
  }
  /**
   * 이 노드가 현재 업데이트 주기 동안 더티(dirty)로 표시되었는지 여부를 반환합니다.
   *
   */
  isDirty(): boolean {
    const editor = getActiveEditor()
    const dirtyLeaves = editor._dirtyLeaves
    return dirtyLeaves !== null && dirtyLeaves.has(this.__key)
  }
  /**
   * 활성 EditorState 에서 노드의 최신 버전을 반환합니다.
   * 이는 오래된 노드 참조로부터 값을 가져오는 것을 방지하기 위해 사용됩니다.
   *
   */
  getLatest(): this {
    const latest = $getNodeByKey<this>(this.__key)
    if (latest === null) {
      invariant(
        false,
        'Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.',
      )
    }
    return latest
  }
  /**
   * 노드의 수정 가능한 버전을 반환합니다. Lexical 에디터의 {@link LexicalEditor.update} 콜백
   * 외부에서 호출될 경우 오류를 발생시킵니다.
   *
   */
  getWritable(): this {
    errorOnReadOnly()
    const editorState = getActiveEditorState()
    const editor = getActiveEditor()
    const nodeMap = editorState._nodeMap
    const key = this.__key
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest()
    const cloneNotNeeded = editor._cloneNotNeeded
    const selection = $getSelection()
    if (selection !== null) {
      selection.setCachedNodes(null)
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode)
      return latestNode
    }
    const mutableNode = $cloneWithProperties(latestNode)
    cloneNotNeeded.add(key)
    internalMarkNodeAsDirty(mutableNode)
    // Update reference in node map
    nodeMap.set(key, mutableNode)

    return mutableNode
  }
  /**
   * Returns the text content of the node. Override this for
   * custom nodes that should have a representation in plain text
   * format (for copy + paste, for example)
   *
   */
  getTextContent(): string {
    return ''
  }
  /**
   * Returns the length of the string produced by calling getTextContent on this node.
   *
   */
  getTextContentSize(): number {
    return this.getTextContent().length
  }

  //
  // View
  //

  /**
   * 이 Lexical 노드에 대해 DOM 에 삽입할 노드를 결정하기 위해
   * 조정(reconciliation) 과정 중에 호출됩니다.
   *
   * 이 메서드는 정확히 하나의 HTMLElement 를 반환해야 합니다. 중첩된 요소는 지원되지 않습니다.
   *
   * 업데이트 수명 주기의 이 단계에서 Lexical EditorState 를 업데이트하려고 시도하지 마십시오.
   *
   * @param _config - 조정 과정 중 EditorTheme(클래스 적용을 위해)와 같은 것들에 접근할 수 있게 해줍니다.
   * @param _editor - 조정 과정 중 컨텍스트를 위해 에디터에 접근할 수 있게 해줍니다.
   *
   * */
  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    invariant(false, 'createDOM: base method not extended')
  }
  /**
   * 노드가 변경되어 DOM 을 업데이트해야 할 때 호출됩니다.
   * 업데이트 중 발생했을 수 있는 변경 사항과 일치하도록
   * 필요한 방식으로 DOM 을 업데이트해야 합니다.
   *
   * 여기서 "true"를 반환하면 Lexical 이 DOM 노드를 언마운트하고
   * 다시 생성합니다(createDOM 을 호출하여).
   * 예를 들어, 요소 태그가 변경되는 경우 이렇게 해야 합니다.
   *
   * @param _prevNode 이전 노드 상태
   * @param _dom 업데이트할 DOM 요소
   * @param _config 에디터 구성
   * @returns DOM 노드를 다시 생성해야 하면 true, 그렇지 않으면 false
   */
  updateDOM(
    _prevNode: unknown,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    invariant(false, 'updateDOM: base method not extended')
  }
  /**
   * 이 노드가 HTML 로 직렬화되는 방식을 제어합니다. 이는 다음과 같은 경우에 중요합니다:
   * 1. Lexical 과 비 Lexical 에디터 간의 복사 및 붙여넣기
   * 2. 서로 다른 네임스페이스를 가진 Lexical 에디터 간의 복사 및 붙여넣기
   * 위의 경우들에서 주요 전송 형식은 HTML 입니다.
   *
   * 또한 {@link @lexical/html!$generateHtmlFromNodes}를 통해 다른 이유로
   * HTML 로 직렬화하는 경우에도 중요합니다.
   *
   * 이 메서드를 사용하여 자체 HTML 렌더러를 구축할 수도 있습니다.
   *
   * @param editor Lexical 에디터 인스턴스
   * @returns DOM 내보내기 결과
   */
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = this.createDOM(editor._config, editor)
    return { element }
  }
  /**
   * 이 노드가 JSON 으로 직렬화되는 방식을 제어합니다. 이는 다음과 같은 경우에 중요합니다:
   * 1. 동일한 네임스페이스를 공유하는 Lexical 에디터 간의 복사 및 붙여넣기
   * 2. 영구 저장소에 JSON 으로 직렬화하는 경우
   *
   * 자세한 내용은 [직렬화 및 역직렬화](https://lexical.dev/docs/concepts/serialization#lexical---html)를 참조하세요.
   *
   * @returns 직렬화된 Lexical 노드
   */
  exportJSON(): SerializedLexicalNode {
    invariant(false, 'exportJSON: base method not extended')
  }
  /**
   * 이 노드가 JSON 에서 역직렬화되는 방식을 제어합니다. 일반적으로 상용구 코드이지만,
   * 노드 구현과 직렬화된 인터페이스 사이에 추상화를 제공합니다.
   * 이는 노드 스키마에 중대한 변경(속성 추가 또는 제거)을 할 때 중요할 수 있습니다.
   *
   * 자세한 내용은 [직렬화 및 역직렬화](https://lexical.dev/docs/concepts/serialization#lexical---html)를 참조하세요.
   *
   * @param _serializedNode 직렬화된 Lexical 노드
   * @returns 역직렬화된 Lexical 노드
   */
  static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .importJSON().',
      this.name,
    )
  }
  /**
   * @experimental
   *
   * 에디터 초기화 중에 반환된 함수를 노드의 변환(transform)으로 등록합니다.
   * 대부분의 이러한 사용 사례는 {@link LexicalEditor.registerNodeTransform} API 를 통해
   * 처리해야 합니다.
   *
   * 실험적 기능 - 사용 시 주의하세요.
   *
   * @returns 노드 변환 함수 또는 null
   */
  static transform(): ((node: LexicalNode) => void) | null {
    return null
  }

  //
  // Setters and mutators
  //

  /**
   * 이 LexicalNode 를 EditorState 에서 제거합니다. 노드가 어딘가에 다시 삽입되지 않으면,
   * Lexical 가비지 컬렉터가 결국 이를 정리할 것입니다.
   *
   * @param preserveEmptyParent - 거짓인 경우, 제거 작업 후 노드의 부모가 비어 있다면
   * 부모 노드도 제거됩니다. 이는 기본 동작이며, {@link ElementNode#canBeEmpty}와 같은
   * 다른 노드 휴리스틱의 영향을 받습니다.
   */
  remove(preserveEmptyParent?: boolean): void {
    $removeNode(this, true, preserveEmptyParent)
  }
  /**
   * 이 LexicalNode 를 제공된 노드로 대체하며, 선택적으로 대체되는 노드의 자식들을
   * 대체하는 노드로 전송합니다.
   *
   * @param replaceWith - 이 노드를 대체할 노드
   * @param includeChildren - 이 노드의 자식들을 대체하는 노드로 전송할지 여부
   */
  replace<N extends LexicalNode>(replaceWith: N, includeChildren?: boolean): N {
    errorOnReadOnly()
    let selection = $getSelection()
    if (selection !== null) {
      selection = selection.clone()
    }
    errorOnInsertTextNodeOnRoot(this, replaceWith)
    const self = this.getLatest()
    const toReplaceKey = this.__key
    const key = replaceWith.__key
    const writableReplaceWith = replaceWith.getWritable()
    const writableParent = this.getParentOrThrow().getWritable()
    const size = writableParent.__size
    removeFromParent(writableReplaceWith)
    const prevSibling = self.getPreviousSibling()
    const nextSibling = self.getNextSibling()
    const prevKey = self.__prev
    const nextKey = self.__next
    const parentKey = self.__parent
    $removeNode(self, false, true)

    if (prevSibling === null) {
      writableParent.__first = key
    } else {
      const writablePrevSibling = prevSibling.getWritable()
      writablePrevSibling.__next = key
    }
    writableReplaceWith.__prev = prevKey
    if (nextSibling === null) {
      writableParent.__last = key
    } else {
      const writableNextSibling = nextSibling.getWritable()
      writableNextSibling.__prev = key
    }
    writableReplaceWith.__next = nextKey
    writableReplaceWith.__parent = parentKey
    writableParent.__size = size
    if (includeChildren) {
      invariant(
        $isElementNode(this) && $isElementNode(writableReplaceWith),
        'includeChildren should only be true for ElementNodes',
      )
      this.getChildren().forEach((child: LexicalNode) => {
        writableReplaceWith.append(child)
      })
    }
    if ($isRangeSelection(selection)) {
      $setSelection(selection)
      const anchor = selection.anchor
      const focus = selection.focus
      if (anchor.key === toReplaceKey) {
        $moveSelectionPointToEnd(anchor, writableReplaceWith)
      }
      if (focus.key === toReplaceKey) {
        $moveSelectionPointToEnd(focus, writableReplaceWith)
      }
    }
    if ($getCompositionKey() === toReplaceKey) {
      $setCompositionKey(key)
    }
    return writableReplaceWith
  }
  /**
   * 이 LexicalNode 뒤에 (다음 형제로) 노드를 삽입합니다.
   *
   * @param nodeToInsert - 이 노드 뒤에 삽입할 노드
   * @param restoreSelection - 작업 완료 후 선택 영역을 적절한 위치로 복원할지 여부
   */
  insertAfter(nodeToInsert: LexicalNode, restoreSelection = true): LexicalNode {
    errorOnReadOnly()
    errorOnInsertTextNodeOnRoot(this, nodeToInsert)
    const writableSelf = this.getWritable()
    const writableNodeToInsert = nodeToInsert.getWritable()
    const oldParent = writableNodeToInsert.getParent()
    const selection = $getSelection()
    let elementAnchorSelectionOnNode = false
    let elementFocusSelectionOnNode = false

    // 삽입할 노드가 이미 다른 부모를 가지고 있는 경우 처리
    if (oldParent !== null) {
      const oldIndex = nodeToInsert.getIndexWithinParent()
      removeFromParent(writableNodeToInsert)
      // 선택 영역이 삽입할 노드와 관련있는지 확인
      if ($isRangeSelection(selection)) {
        const oldParentKey = oldParent.__key
        const anchor = selection.anchor
        const focus = selection.focus
        elementAnchorSelectionOnNode =
          anchor.type === 'element' &&
          anchor.key === oldParentKey &&
          anchor.offset === oldIndex + 1
        elementFocusSelectionOnNode =
          focus.type === 'element' &&
          focus.key === oldParentKey &&
          focus.offset === oldIndex + 1
      }
    }

    // 새로운 위치에 노드 삽입
    const nextSibling = this.getNextSibling()
    const writableParent = this.getParentOrThrow().getWritable()
    const insertKey = writableNodeToInsert.__key
    const nextKey = writableSelf.__next

    // 부모 노드의 마지막 자식 업데이트
    if (nextSibling === null) {
      writableParent.__last = insertKey
    } else {
      const writableNextSibling = nextSibling.getWritable()
      writableNextSibling.__prev = insertKey
    }

    // 부모 노드 크기 증가 및 연결 관계 업데이트
    writableParent.__size++
    writableSelf.__next = insertKey
    writableNodeToInsert.__next = nextKey
    writableNodeToInsert.__prev = writableSelf.__key
    writableNodeToInsert.__parent = writableSelf.__parent

    // 선택 영역 복원
    if (restoreSelection && $isRangeSelection(selection)) {
      const index = this.getIndexWithinParent()
      $updateElementSelectionOnCreateDeleteNode(
        selection,
        writableParent,
        index + 1,
      )
      const writableParentKey = writableParent.__key
      if (elementAnchorSelectionOnNode) {
        selection.anchor.set(writableParentKey, index + 2, 'element')
      }
      if (elementFocusSelectionOnNode) {
        selection.focus.set(writableParentKey, index + 2, 'element')
      }
    }
    return nodeToInsert
  }
  /**
   * 이 LexicalNode 앞에 (이전 형제로) 노드를 삽입합니다.
   *
   * @param nodeToInsert - 이 노드 앞에 삽입할 노드
   * @param restoreSelection - 작업 완료 후 선택 영역을 적절한 위치로 복원할지 여부
   */
  insertBefore(
    nodeToInsert: LexicalNode,
    restoreSelection = true,
  ): LexicalNode {
    errorOnReadOnly()
    errorOnInsertTextNodeOnRoot(this, nodeToInsert)

    const writableSelf = this.getWritable()
    const writableNodeToInsert = nodeToInsert.getWritable()
    const insertKey = writableNodeToInsert.__key
    removeFromParent(writableNodeToInsert)

    const prevSibling = this.getPreviousSibling()
    const writableParent = this.getParentOrThrow().getWritable()
    const prevKey = writableSelf.__prev
    // TODO: this is O(n), can we improve?
    const index = this.getIndexWithinParent()
    if (prevSibling === null) {
      writableParent.__first = insertKey
    } else {
      const writablePrevSibling = prevSibling.getWritable()
      writablePrevSibling.__next = insertKey
    }

    writableParent.__size++
    writableSelf.__prev = insertKey
    writableNodeToInsert.__prev = prevKey
    writableNodeToInsert.__next = writableSelf.__key
    writableNodeToInsert.__parent = writableSelf.__parent
    const selection = $getSelection()
    if (restoreSelection && $isRangeSelection(selection)) {
      const parent = this.getParentOrThrow()
      $updateElementSelectionOnCreateDeleteNode(selection, parent, index)
    }

    return nodeToInsert
  }
  /**
   * 이 노드가 필수적인 부모 노드를 필요로 하는지 여부를 반환합니다.
   * 이 메서드는 주로 복사 및 붙여넣기 작업 중에 사용되며,
   * 그렇지 않으면 고아가 될 노드들을 정규화하는 데 사용됩니다.
   *
   * 예를 들어:
   * - ListNode 부모가 없는 ListItemNode
   * - ParagraphNode 부모가 있는 TextNode
   *
   * @returns {boolean} 이 노드가 특정 부모 노드를 반드시 필요로 하면 true, 그렇지 않으면 false
   */
  isParentRequired(): boolean {
    return false
  }
  /**
   * 필수 부모 노드의 생성 로직입니다.
   * {@link isParentRequired}가 true를 반환하는 경우 구현되어야 합니다.
   *
   * @returns {ElementNode} 생성된 부모 요소 노드
   */
  createParentElementNode(): ElementNode {
    return $createParagraphNode()
  }
  /**
   * 이 노드의 시작 부분을 선택합니다.
   *
   * @returns {RangeSelection} 이 노드의 시작 부분을 가리키는 범위 선택
   */
  selectStart(): RangeSelection {
    return this.selectPrevious()
  }
  /**
   * 이 노드의 끝 부분을 선택합니다.
   *
   * @returns {RangeSelection} 이 노드의 끝 부분을 가리키는 범위 선택
   */
  selectEnd(): RangeSelection {
    return this.selectNext(0, 0)
  }
  /**
   * 이 노드의 이전 형제 노드로 선택을 이동합니다. 지정된 오프셋에 따라 선택됩니다.
   *
   * @param anchorOffset - 선택의 앵커 오프셋
   * @param focusOffset - 선택의 포커스 오프셋
   * @returns {RangeSelection} 새로운 범위 선택
   */
  selectPrevious(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly()
    const prevSibling = this.getPreviousSibling()
    const parent = this.getParentOrThrow()

    if (prevSibling === null) {
      return parent.select(0, 0)
    }

    if ($isElementNode(prevSibling)) {
      return prevSibling.select()
    } else if (!$isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1
      return parent.select(index, index)
    }

    return prevSibling.select(anchorOffset, focusOffset)
  }
  /**
   * 이 노드의 다음 형제 노드로 선택을 이동합니다. 지정된 오프셋에 따라 선택됩니다.
   *
   * @param anchorOffset - 선택의 앵커 오프셋
   * @param focusOffset - 선택의 포커스 오프셋
   * @returns {RangeSelection} 새로운 범위 선택
   */
  selectNext(anchorOffset?: number, focusOffset?: number): RangeSelection {
    errorOnReadOnly()
    const nextSibling = this.getNextSibling()
    const parent = this.getParentOrThrow()

    if (nextSibling === null) {
      return parent.select()
    }

    if ($isElementNode(nextSibling)) {
      return nextSibling.select(0, 0)
    } else if (!$isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent()
      return parent.select(index, index)
    }

    return nextSibling.select(anchorOffset, focusOffset)
  }
  /**
   * Marks a node dirty, triggering transforms and
   * forcing it to be reconciled during the update cycle.
   *
   * */
  markDirty(): void {
    this.getWritable()
  }
}

function errorOnTypeKlassMismatch(
  type: string,
  klass: Klass<LexicalNode>,
): void {
  const registeredNode = getActiveEditor()._nodes.get(type)
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    invariant(
      false,
      'Create node: Attempted to create node %s that was not configured to be used on the editor.',
      klass.name,
    )
  }
  const editorKlass = registeredNode.klass
  if (editorKlass !== klass) {
    invariant(
      false,
      'Create node: Type %s in node %s does not match registered node %s with the same type',
      type,
      klass.name,
      editorKlass.name,
    )
  }
}
/**
 * 이 LexicalNode 뒤에 (다음 형제로) 일련의 노드들을 삽입합니다.
 *
 * @param node - 노드들을 삽입할 기준이 되는 노드
 * @param firstToInsert - 삽입할 첫 번째 노드
 * @param lastToInsert - 삽입할 마지막 노드. firstToInsert 의 후속 형제여야 합니다.
 *                       제공되지 않으면 firstToInsert 의 마지막 형제가 사용됩니다.
 */
export function insertRangeAfter(
  node: LexicalNode,
  firstToInsert: LexicalNode,
  lastToInsert?: LexicalNode,
) {
  const lastToInsert2 =
    lastToInsert || firstToInsert.getParentOrThrow().getLastChild()!
  let current = firstToInsert
  const nodesToInsert = [firstToInsert]
  while (current !== lastToInsert2) {
    if (!current.getNextSibling()) {
      invariant(
        false,
        'insertRangeAfter: lastToInsert must be a later sibling of firstToInsert',
      )
    }
    current = current.getNextSibling()!
    nodesToInsert.push(current)
  }

  let currentNode: LexicalNode = node
  for (const nodeToInsert of nodesToInsert) {
    currentNode = currentNode.insertAfter(nodeToInsert)
  }
}

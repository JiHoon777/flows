import type {
  CommandPayloadType,
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
  LexicalCommand,
  TextNodeThemeClasses,
} from './lexical-editor.type'
import type { Spread } from './lexical-type'
import type { TextFormatType } from './nodes/lexical-text-node.type'
import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  LexicalNode,
  NodeKey,
  NodeMap,
} from '@/lib/lexical/lexical-node.ts'
import { $getNodeByKey } from '@/lib/lexical/lexical-node.ts'
import type {
  BaseSelection,
  PointType,
} from '@/lib/lexical/lexical-selection.ts'
import {
  $getSelection,
  $isRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { RootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'

import {
  HAS_DIRTY_NODES,
  TEXT_TYPE_TO_FORMAT,
} from '@/lib/lexical/lexical-constants.ts'
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  internalGetActiveEditorState,
  isCurrentlyReadOnlyMode,
  triggerCommandListeners,
  updateEditor,
} from '@/lib/lexical/lexical-updates.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'
import { normalizeClassNames } from '@/utils/normalize-class-name'
import { CAN_USE_DOM } from '@/utils/can-use-dom.ts'

export const emptyFunction = () => {
  return
}

let keyCounter = 1

export function resetRandomKey(): void {
  keyCounter = 1
}

export function generateRandomKey(): string {
  return '' + keyCounter++
}

export function errorOnNodeKeyConstructorMismatch(
  node: LexicalNode,
  existingKey: NodeKey,
): void {
  const editorState = internalGetActiveEditorState()

  if (!editorState) {
    // tests expect to be able to do this kind of clone without an active editor state
    return
  }
  const existingNode = editorState._nodeMap.get(existingKey)
  if (existingNode && existingNode.constructor !== node.constructor) {
    // Lifted condition to if statement because the inverted logic is a bit confusing
    if (node.constructor.name !== existingNode.constructor.name) {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with constructor %s. Keys must not be re-used when the type is changed.',
        node.constructor.name,
        existingNode.constructor.name,
      )
    } else {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with different constructor with the same name (possibly due to invalid Hot Module Replacement). Keys must not be re-used when the type is changed.',
        node.constructor.name,
      )
    }
  }
}

export function $getCompositionKey(): null | NodeKey {
  if (isCurrentlyReadOnlyMode()) {
    return null
  }
  const editor = getActiveEditor()
  return editor._compositionKey
}

/**
 * 컴포지션 키를 설정합니다. 컴포지션 키는 현재 입력 중인(조합 중인) 텍스트의 위치를 나타냅니다.
 *
 * @param compositionKey - 설정할 컴포지션 키. null 이면 컴포지션을 종료합니다.
 */
export function $setCompositionKey(compositionKey: null | NodeKey): void {
  errorOnReadOnly()
  const editor = getActiveEditor()
  const previousCompositionKey = editor._compositionKey
  if (compositionKey !== previousCompositionKey) {
    editor._compositionKey = compositionKey
    if (previousCompositionKey !== null) {
      const node = $getNodeByKey(previousCompositionKey)
      if (node !== null) {
        node.getWritable()
      }
    }
    if (compositionKey !== null) {
      const node = $getNodeByKey(compositionKey)
      if (node !== null) {
        node.getWritable()
      }
    }
  }
}
export function $getRoot(): RootNode {
  return internalGetRoot(getActiveEditorState())
}

export function internalGetRoot(editorState: EditorState): RootNode {
  return editorState._nodeMap.get('root') as RootNode
}

/**
 * 부모 요소들을 dirty 로 표시하는 내부 함수입니다.
 *
 * @param parentKey - 시작할 부모 노드의 키
 * @param nodeMap - 전체 노드 맵
 * @param dirtyElements - dirty 로 표시된 요소들을 추적하는 맵
 */
export function internalMarkParentElementsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let nextParentKey: string | null = parentKey
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return
    }
    const node = nodeMap.get(nextParentKey)
    if (node === undefined) {
      break
    }
    dirtyElements.set(nextParentKey, false)
    nextParentKey = node.__parent
  }
}

/**
 * 노드를 "dirty"로 표시합니다. 이는 노드가 변경되었음을 나타냅니다.
 *
 * @param node - "dirty"로 표시할 LexicalNode
 *
 * @internal
 * @warning 이 함수를 직접 사용하지 마세요! 클로닝 휴리스틱을 손상시킬 수 있습니다.
 * 대신 node.getWritable()을 사용하세요.
 *
 * @description
 * 이 함수는 노드와 그 부모 요소들을 "dirty"로 표시합니다. 이는 에디터에게
 * 해당 노드들이 변경되었으며 업데이트가 필요함을 알립니다.
 *
 * 동작 과정:
 * 1. 무한 변환 오류를 체크합니다.
 * 2. 노드의 부모 요소들을 "dirty"로 표시합니다.
 * 3. 에디터의 상태를 "dirty nodes 있음"으로 설정합니다.
 * 4. 노드 유형에 따라 적절한 "dirty" 컬렉션에 추가합니다.
 *
 * @note
 * - 이 함수는 내부 사용을 위한 것이며, 직접 호출하면 예기치 않은 동작이 발생할 수 있습니다.
 * - TODO: 이 함수를 Element와 Leaf 노드를 위한 두 개의 전용 함수로 분리해야 합니다.
 */
export function internalMarkNodeAsDirty(node: LexicalNode): void {
  errorOnInfiniteTransforms()
  const latest = node.getLatest()
  const parent = latest.__parent
  const editorState = getActiveEditorState()
  const editor = getActiveEditor()
  const nodeMap = editorState._nodeMap
  const dirtyElements = editor._dirtyElements
  if (parent !== null) {
    internalMarkParentElementsAsDirty(parent, nodeMap, dirtyElements)
  }
  const key = latest.__key
  editor._dirtyType = HAS_DIRTY_NODES
  if ($isElementNode(node)) {
    dirtyElements.set(key, true)
  } else {
    editor._dirtyLeaves.add(key)
  }
}

/**
 * 노드의 복제본을 반환합니다. 복제본은 동일한 키와 부모/다음/이전 포인터를 가지며,
 * KlassConstructor.clone 에 의해 설정되지 않는 다른 속성들(format, style 등)도 포함합니다.
 *
 * EditorState 를 변경하지 않습니다.
 * @param latestNode - 복제할 노드
 * @returns 노드의 복제본
 */
export function $cloneWithProperties<T extends LexicalNode>(latestNode: T): T {
  const constructor = latestNode.constructor
  const mutableNode = constructor.clone(latestNode) as T
  mutableNode.__parent = latestNode.__parent
  mutableNode.__next = latestNode.__next
  mutableNode.__prev = latestNode.__prev
  if ($isElementNode(latestNode) && $isElementNode(mutableNode)) {
    if ($isParagraphNode(latestNode) && $isParagraphNode(mutableNode)) {
      mutableNode.__textFormat = latestNode.__textFormat
      mutableNode.__textStyle = latestNode.__textStyle
    }
    mutableNode.__first = latestNode.__first
    mutableNode.__last = latestNode.__last
    mutableNode.__size = latestNode.__size
    mutableNode.__indent = latestNode.__indent
    mutableNode.__format = latestNode.__format
    mutableNode.__style = latestNode.__style
    mutableNode.__dir = latestNode.__dir
  } else if ($isTextNode(latestNode) && $isTextNode(mutableNode)) {
    mutableNode.__format = latestNode.__format
    mutableNode.__style = latestNode.__style
    mutableNode.__mode = latestNode.__mode
    mutableNode.__detail = latestNode.__detail
  }
  if (__DEV__) {
    invariant(
      mutableNode.__key === latestNode.__key,
      "$cloneWithProperties: %s.clone(node) (with type '%s') did not return a node with the same key, make sure to specify node.__key as the last argument to the constructor",
      constructor.name,
      constructor.getType(),
    )
  }
  return mutableNode
}

export function errorOnInsertTextNodeOnRoot(
  node: LexicalNode,
  insertNode: LexicalNode,
): void {
  const parentNode = node.getParent()
  if (
    $isRootNode(parentNode) &&
    !$isElementNode(insertNode) &&
    !$isDecoratorNode(insertNode)
  ) {
    invariant(
      false,
      'Only element or decorator nodes can be inserted in to the root node',
    )
  }
}

export function removeFromParent(node: LexicalNode): void {
  const oldParent = node.getParent()
  if (oldParent === null) {
    return
  }
  const writableNode = node.getWritable()
  const writableParent = oldParent.getWritable()
  const prevSibling = node.getPreviousSibling()
  const nextSibling = node.getNextSibling()
  // TODO: this function duplicates a bunch of operations, can be simplified.
  if (prevSibling === null) {
    if (nextSibling !== null) {
      const writableNextSibling = nextSibling.getWritable()
      writableParent.__first = nextSibling.__key
      writableNextSibling.__prev = null
    } else {
      writableParent.__first = null
    }
  } else {
    const writablePrevSibling = prevSibling.getWritable()
    if (nextSibling !== null) {
      const writableNextSibling = nextSibling.getWritable()
      writableNextSibling.__prev = writablePrevSibling.__key
      writablePrevSibling.__next = writableNextSibling.__key
    } else {
      writablePrevSibling.__next = null
    }
    writableNode.__prev = null
  }

  if (nextSibling === null) {
    if (prevSibling !== null) {
      const writablePrevSibling = prevSibling.getWritable()
      writableParent.__last = prevSibling.__key
      writablePrevSibling.__next = null
    } else {
      writableParent.__last = null
    }
  } else {
    const writableNextSibling = nextSibling.getWritable()
    if (prevSibling !== null) {
      const writablePrevSibling = prevSibling.getWritable()
      writablePrevSibling.__next = writableNextSibling.__key
      writableNextSibling.__prev = writablePrevSibling.__key
    } else {
      writableNextSibling.__prev = null
    }
    writableNode.__next = null
  }
  writableParent.__size--
  writableNode.__parent = null
}

export function $setSelection(selection: null | BaseSelection): void {
  errorOnReadOnly()
  const editorState = getActiveEditorState()
  if (selection !== null) {
    if (__DEV__) {
      if (Object.isFrozen(selection)) {
        invariant(
          false,
          '$setSelection called on frozen selection object. Ensure selection is cloned before passing in.',
        )
      }
    }
    selection.dirty = true
    selection.setCachedNodes(null)
  }
  editorState._selection = selection
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
 * 주어진 노드에 대한 대체 노드를 적용합니다.
 *
 * @param node - 대체를 적용할 LexicalNode
 * @returns - 대체된 노드 또는 원본 노드
 */
export function $applyNodeReplacement<N extends LexicalNode>(
  node: LexicalNode,
): N {
  const editor = getActiveEditor()
  const nodeType = node.constructor.getType()
  const registeredNode = editor._nodes.get(nodeType)
  if (registeredNode === undefined) {
    invariant(
      false,
      '$initializeNode failed. Ensure node has been registered to the editor. You can do this by passing the node class via the "nodes" array in the editor config.',
    )
  }

  const replaceFunc = registeredNode.replace
  if (replaceFunc !== null) {
    const replacementNode = replaceFunc(node) as N
    if (!(replacementNode instanceof node.constructor)) {
      invariant(
        false,
        '$initializeNode failed. Ensure replacement node is a subclass of the original node.',
      )
    }
    return replacementNode
  }

  return node as N
}

/**
 * 주어진 자식 노드가 목표 노드의 자손인지 확인합니다.
 *
 * @param child - 자손 관계를 확인할 자식 노드
 * @param targetNode - 조상인지 확인할 목표 노드
 * @returns {boolean} child 가 targetNode 의 자손이면 true, 그렇지 않으면 false
 */
export function $hasAncestor(
  child: LexicalNode,
  targetNode: LexicalNode,
): boolean {
  let parent = child.getParent()
  while (parent !== null) {
    if (parent.is(targetNode)) {
      return true
    }
    parent = parent.getParent()
  }
  return false
}

/**
 * 자식 노드의 선택을 부모 노드로 이동시킵니다(필요한 경우에만).
 *
 * @param parentNode - 선택을 이동시킬 대상이 되는 부모 노드
 * @returns {BaseSelection | null} 업데이트된 선택 객체 또는 null
 */
export function $maybeMoveChildrenSelectionToParent(
  parentNode: LexicalNode,
): BaseSelection | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !$isElementNode(parentNode)) {
    return selection
  }
  const { anchor, focus } = selection
  const anchorNode = anchor.getNode()
  const focusNode = focus.getNode()
  if ($hasAncestor(anchorNode, parentNode)) {
    anchor.set(parentNode.__key, 0, 'element')
  }
  if ($hasAncestor(focusNode, parentNode)) {
    focus.set(parentNode.__key, 0, 'element')
  }
  return selection
}

const ShadowRootNodeBrand: unique symbol = Symbol.for(
  '@lexical/ShadowRootNodeBrand',
)
type ShadowRootNode = Spread<
  { isShadowRoot(): true; [ShadowRootNodeBrand]: never },
  ElementNode
>
export function $isRootOrShadowRoot(
  node: null | LexicalNode,
): node is RootNode | ShadowRootNode {
  return $isRootNode(node) || ($isElementNode(node) && node.isShadowRoot())
}

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is a block node
 */
export function isBlockDomNode(node: Node) {
  const blockNodes = new RegExp(
    /^(address|article|aside|blockquote|canvas|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|noscript|ol|p|pre|section|table|td|tfoot|ul|video)$/,
    'i',
  )

  return node.nodeName.match(blockNodes) !== null
}

export function getCachedClassNameArray<
  T extends EditorThemeClasses | TextNodeThemeClasses,
  K extends keyof T,
>(classNamesTheme: T, classNameThemeType: K): Array<string> {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {}
  }

  const classNamesCache = classNamesTheme.__lexicalClassNameCache
  const cachedClassNames = classNamesCache[classNameThemeType as string]
  if (cachedClassNames !== undefined) {
    return cachedClassNames
  }

  const classNames = classNamesTheme[classNameThemeType]
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames)
    classNamesCache[classNameThemeType as string] = classNamesArr
    return classNamesArr
  }

  return classNames as string[]
}

/**
 * 텍스트 형식을 토글하는 함수
 *
 * @param format - 현재 형식을 나타내는 숫자
 * @param type - 토글할 텍스트 형식 타입
 * @param alignWithFormat - 정렬할 형식 (null이면 토글, 아니면 해당 형식과 정렬)
 * @returns 새로운 형식을 나타내는 숫자
 *
 * @description
 * 이 함수는 주어진 텍스트 형식을 토글하거나 특정 형식과 정렬합니다.
 * 특별히 'subscript'와 'superscript' 형식은 상호 배타적으로 처리됩니다.
 */
export function toggleTextFormatType(
  format: number,
  type: TextFormatType,
  alignWithFormat: null | number,
): number {
  const activeFormat = TEXT_TYPE_TO_FORMAT[type]

  // alignWithFormat이 null이 아니고, 현재 형식과 정렬이 필요한 경우 변경 없이 반환
  if (
    alignWithFormat !== null &&
    (format & activeFormat) === (alignWithFormat & activeFormat)
  ) {
    return format
  }

  // XOR 연산을 사용하여 형식을 토글합니다.
  let newFormat = format ^ activeFormat

  // 'subscript'와 'superscript' 형식의 상호 배타적 처리
  if (type === 'subscript') {
    // 'subscript'를 설정할 때 'superscript'를 제거
    newFormat &= ~TEXT_TYPE_TO_FORMAT.superscript
  } else if (type === 'superscript') {
    // 'superscript'를 설정할 때 'subscript'를 제거
    newFormat &= ~TEXT_TYPE_TO_FORMAT.subscript
  }

  return newFormat
}

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is an inline node
 */
export function isInlineDomNode(node: Node) {
  const inlineNodes = new RegExp(
    /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var|#text)$/,
    'i',
  )
  return node.nodeName.match(inlineNodes) !== null
}

/**
 * @param x - The element being testing
 * @returns Returns true if x is an HTML element, false otherwise.
 */
export function isHTMLElement(x: Node | EventTarget): x is HTMLElement {
  // @ts-ignore-next-line - strict check on nodeType here should filter out non-Element EventTarget implementors
  return x.nodeType === 1
}

/**
 * 주어진 노드의 이전 및 다음 형제 노드를 "dirty"로 표시합니다.
 *
 * @param node - 형제 노드들을 "dirty"로 표시할 기준이 되는 LexicalNode
 *
 * @internal
 * @description
 * 이 함수는 주어진 노드의 직접적인 이전 및 다음 형제 노드를 찾아
 * 각각을 "dirty"로 표시합니다. 이는 노드 주변의 컨텍스트가
 * 변경되었을 수 있음을 나타냅니다.
 *
 * 동작 과정:
 * 1. 노드의 이전 형제를 찾아 "dirty"로 표시합니다.
 * 2. 노드의 다음 형제를 찾아 "dirty"로 표시합니다.
 *
 * @note
 * - 이 함수는 내부 사용을 위한 것입니다.
 * - 형제 노드가 없는 경우(null)에는 아무 동작도 수행하지 않습니다.
 */
export function internalMarkSiblingsAsDirty(node: LexicalNode) {
  const previousNode = node.getPreviousSibling()
  const nextNode = node.getNextSibling()
  if (previousNode !== null) {
    internalMarkNodeAsDirty(previousNode)
  }
  if (nextNode !== null) {
    internalMarkNodeAsDirty(nextNode)
  }
}

/** @internal */
export type TypeToNodeMap = Map<string, NodeMap>
/**
 * @internal
 * Compute a cached Map of node type to nodes for a frozen EditorState
 */
const cachedNodeMaps = new WeakMap<EditorState, TypeToNodeMap>()
const EMPTY_TYPE_TO_NODE_MAP: TypeToNodeMap = new Map()
/**
 * 고정된 EditorState에 대해 노드 타입에서 노드로의 캐시된 맵을 반환합니다.
 *
 * @param editorState - 캐시된 노드 맵을 가져올 EditorState입니다.
 * @returns TypeToNodeMap - 노드 타입에서 노드로의 맵을 반환합니다.
 * @throws editorState가 쓰기 가능한 상태일 때 오류를 발생시킵니다.
 */
export function getCachedTypeToNodeMap(
  editorState: EditorState,
): TypeToNodeMap {
  // 새로운 Editor의 경우, 'root' 항목만 있는 writable this._editorState를 가질 수 있습니다.
  if (!editorState._readOnly && editorState.isEmpty()) {
    return EMPTY_TYPE_TO_NODE_MAP
  }
  invariant(
    editorState._readOnly,
    'getCachedTypeToNodeMap called with a writable EditorState',
  )
  let typeToNodeMap = cachedNodeMaps.get(editorState)
  if (!typeToNodeMap) {
    typeToNodeMap = new Map()
    cachedNodeMaps.set(editorState, typeToNodeMap)
    for (const [nodeKey, node] of editorState._nodeMap) {
      const nodeType = node.__type
      let nodeMap = typeToNodeMap.get(nodeType)
      if (!nodeMap) {
        nodeMap = new Map()
        typeToNodeMap.set(nodeType, nodeMap)
      }
      nodeMap.set(nodeKey, node)
    }
  }
  return typeToNodeMap
}

export function dispatchCommand<TCommand extends LexicalCommand<unknown>>(
  editor: LexicalEditor,
  command: TCommand,
  payload: CommandPayloadType<TCommand>,
): boolean {
  return triggerCommandListeners(editor, command, payload)
}

export function getDOMSelection(targetWindow: null | Window): null | Selection {
  return !CAN_USE_DOM ? null : (targetWindow || window).getSelection()
}

/**
 * 주어진 DOM 노드에서 가장 가까운 LexicalEditor 인스턴스를 가져옵니다.
 *
 * @param node - 검색할 시작 노드입니다.
 * @returns 가장 가까운 LexicalEditor 인스턴스를 반환합니다. 찾지 못한 경우 null을 반환합니다.
 */
export function getNearestEditorFromDOMNode(
  node: Node | null,
): LexicalEditor | null {
  let currentNode = node
  while (currentNode != null) {
    // @ts-expect-error: internal field
    const editor: LexicalEditor = currentNode.__lexicalEditor
    if (editor != null) {
      return editor
    }
    currentNode = getParentElement(currentNode)
  }
  return null
}

/**
 * 주어진 노드의 부모 요소를 가져옵니다.
 *
 * @param node - 부모 요소를 가져올 노드입니다.
 * @returns 부모 요소를 반환합니다. 부모 요소가 없거나 shadow DOM의 루트인 경우 null을 반환합니다.
 */
export function getParentElement(node: Node): HTMLElement | null {
  const parentElement =
    (node as HTMLSlotElement).assignedSlot || node.parentElement
  return parentElement !== null && parentElement.nodeType === 11
    ? ((parentElement as unknown as ShadowRoot).host as HTMLElement)
    : parentElement
}

/**
 * 전파될 에디터 목록을 가져옵니다.
 *
 * @param editor - 전파할 에디터입니다.
 * @returns 전파될 에디터 목록을 반환합니다.
 */
export function getEditorsToPropagate(
  editor: LexicalEditor,
): Array<LexicalEditor> {
  const editorsToPropagate = []
  let currentEditor: LexicalEditor | null = editor
  while (currentEditor !== null) {
    editorsToPropagate.push(currentEditor)
    currentEditor = currentEditor._parentEditor
  }
  return editorsToPropagate
}

/**
 * 주어진 DOM 요소의 기본 뷰(윈도우 객체)를 가져옵니다.
 *
 * @param domElem - 기본 뷰를 가져올 DOM 요소입니다.
 * @returns 기본 뷰(윈도우 객체)를 반환합니다. 기본 뷰가 없으면 null을 반환합니다.
 */
export function getDefaultView(domElem: HTMLElement): Window | null {
  const ownerDoc = domElem.ownerDocument
  return (ownerDoc && ownerDoc.defaultView) || null
}

/**
 * 에디터의 윈도우 객체를 가져옵니다.
 *
 * @param editor - 윈도우 객체를 가져올 LexicalEditor 인스턴스입니다.
 * @returns 에디터의 윈도우 객체를 반환합니다.
 * @throws 윈도우 객체를 찾을 수 없는 경우 오류를 발생시킵니다.
 */
export function getWindow(editor: LexicalEditor): Window {
  const windowObj = editor._window
  if (windowObj === null) {
    invariant(false, 'window object not found')
  }
  return windowObj
}

/**
 * 에디터의 모든 노드를 더티 상태로 표시합니다.
 *
 * @param editor - 모든 노드를 더티 상태로 표시할 LexicalEditor 인스턴스입니다.
 * @param type - 더티 상태로 표시할 노드의 타입입니다.
 */
export function markAllNodesAsDirty(editor: LexicalEditor, type: string): void {
  // Mark all existing text nodes as dirty
  updateEditor(
    editor,
    () => {
      const editorState = getActiveEditorState()
      if (editorState.isEmpty()) {
        return
      }
      if (type === 'root') {
        $getRoot().markDirty()
        return
      }
      const nodeMap = editorState._nodeMap
      for (const [, node] of nodeMap) {
        node.markDirty()
      }
    },
    editor._pendingEditorState === null
      ? {
          tag: 'history-merge',
        }
      : undefined,
  )
}

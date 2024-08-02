import type { Spread } from './lexical-type'
import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type {
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
} from './lexical-editor.type'
import type {
  LexicalNode,
  NodeKey,
  NodeMap,
} from '@/lib/lexical/lexical-node.ts'
import type {
  BaseSelection,
  PointType,
} from '@/lib/lexical/lexical-selection.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { RootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'

import { HAS_DIRTY_NODES } from '@/lib/lexical/lexical-constants.ts'
import { $getNodeByKey } from '@/lib/lexical/lexical-node.ts'
import {
  $getSelection,
  $isRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  internalGetActiveEditorState,
  isCurrentlyReadOnlyMode,
} from '@/lib/lexical/lexical-updates.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'
import { normalizeClassNames } from '@/utils/normalize-class-name'

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
 * Never use this function directly! It will break
 * the cloning heuristic. Instead use node.getWritable().
 *
 * @param node - dirty 로 표시할 노드
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

export function getCachedClassNameArray(
  classNamesTheme: EditorThemeClasses,
  classNameThemeType: string,
): Array<string> {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {}
  }

  const classNamesCache = classNamesTheme.__lexicalClassNameCache
  const cachedClassNames = classNamesCache[classNameThemeType]
  if (cachedClassNames !== undefined) {
    return cachedClassNames
  }

  const classNames = classNamesTheme[classNameThemeType]
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames)
    classNamesCache[classNameThemeType] = classNamesArr
    return classNamesArr
  }

  return classNames
}

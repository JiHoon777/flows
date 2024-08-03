import type { LexicalCommand } from '@/lib/lexical/lexical-commands.ts'
import type {
  EditorState,
  SerializedEditorState,
} from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  CommandPayloadType,
  EditorUpdateOptions,
  Listener,
  MutatedNodes,
  RegisteredNodes,
  Transform,
} from '@/lib/lexical/lexical-editor.type.ts'
import type {
  LexicalNode,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'

import { SELECTION_CHANGE_COMMAND } from '@/lib/lexical/lexical-commands.ts'
import {
  FULL_RECONCILE,
  NO_DIRTY_NODES,
} from '@/lib/lexical/lexical-constants.ts'
import {
  cloneEditorState,
  createEmptyEditorState,
  editorStateHasDirtySelection,
} from '@/lib/lexical/lexical-editor-state.ts'
import { resetEditor } from '@/lib/lexical/lexical-editor.ts'
import {
  $garbageCollectDetachedDecorators,
  $garbageCollectDetachedNodes,
} from '@/lib/lexical/lexical-gc.ts'
import { initMutationObserver } from '@/lib/lexical/lexical-mutations.ts'
import { $normalizeTextNode } from '@/lib/lexical/lexical-normalization.ts'
import { $reconcileRoot } from '@/lib/lexical/lexical-reconciler.ts'
import {
  $internalCreateSelection,
  $isNodeSelection,
  $isRangeSelection,
  applySelectionTransforms,
  updateDOMSelection,
} from '@/lib/lexical/lexical-selection.ts'
import {
  $getCompositionKey,
  getDOMSelection,
  getEditorStateTextContent,
  getEditorsToPropagate,
  getRegisteredNodeOrThrow,
  removeDOMBlockCursorElement,
  scheduleMicroTask,
  updateDOMBlockCursorElement,
} from '@/lib/lexical/lexical-utils.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'

let activeEditorState: null | EditorState = null
let activeEditor: null | LexicalEditor = null
let isReadOnlyMode = false
let isAttemptingToRecoverFromReconcilerError = false
let infiniteTransformCount = 0

const observerOptions = {
  characterData: true,
  childList: true,
  subtree: true,
}

export function isCurrentlyReadOnlyMode(): boolean {
  return (
    isReadOnlyMode ||
    (activeEditorState !== null && activeEditorState._readOnly)
  )
}

export function errorOnReadOnly(): void {
  if (isReadOnlyMode) {
    invariant(false, 'Cannot use method in read-only mode')
  }
}

export function errorOnInfiniteTransforms(): void {
  if (infiniteTransformCount > 99) {
    invariant(
      false,
      'One or more transforms are endlessly triggering additional transforms. May have encountered infinite recursion caused by transforms that have their preconditions too lose and/or conflict with each other.',
    )
  }
}

export function getActiveEditorState(): EditorState {
  if (activeEditorState === null) {
    invariant(
      false,
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update(), editor.read(), or editorState.read().',
    )
  }

  return activeEditorState
}

export function getActiveEditor(): LexicalEditor {
  if (activeEditor === null) {
    invariant(
      false,
      'Unable to find an active editor. ' +
        'This method can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editor.read().',
    )
  }

  return activeEditor
}

export function internalGetActiveEditor(): LexicalEditor | null {
  return activeEditor
}

export function internalGetActiveEditorState(): EditorState | null {
  return activeEditorState
}

/**
 * 주어진 편집기와 노드에 대한 변환을 적용합니다.
 *
 * @param editor - 변환을 적용할 LexicalEditor입니다.
 * @param node - 변환을 적용할 LexicalNode입니다.
 * @param transformsCache - 변환 캐시를 저장할 맵입니다.
 */
export function $applyTransforms(
  editor: LexicalEditor,
  node: LexicalNode,
  transformsCache: Map<string, Array<Transform<LexicalNode>>>,
): void {
  const type = node.__type
  const registeredNode = getRegisteredNodeOrThrow(editor, type)
  let transformsArr = transformsCache.get(type)

  if (transformsArr === undefined) {
    transformsArr = Array.from(registeredNode.transforms)
    transformsCache.set(type, transformsArr)
  }

  const transformsArrLength = transformsArr.length

  for (let i = 0; i < transformsArrLength; i++) {
    transformsArr[i](node)

    if (!node.isAttached()) {
      break
    }
  }
}

/**
 * 주어진 노드가 변환에 유효한지 확인합니다.
 * 이 함수는 노드가 정의되어 있고, 현재 입력 구성 중이지 않으며,
 * 노드가 편집기에 연결되어 있는지 확인합니다.
 *
 * @param node - 검사할 LexicalNode입니다.
 * @param compositionKey - 현재 입력 구성 키입니다.
 * @returns 변환에 유효한 노드인지 여부를 나타내는 boolean 값입니다.
 */
function $isNodeValidForTransform(
  node: LexicalNode,
  compositionKey: null | string,
): boolean {
  return (
    node !== undefined &&
    // We don't want to transform nodes being composed
    node.__key !== compositionKey &&
    node.isAttached()
  )
}

/**
 * 모든 변경된 텍스트 노드를 정규화합니다.
 * 이 함수는 에디터 상태와 에디터에서 변경된 모든 텍스트 노드를 찾아 정규화 작업을 수행합니다.
 *
 * @param editorState - 현재 에디터 상태입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 */
function $normalizeAllDirtyTextNodes(
  editorState: EditorState,
  editor: LexicalEditor,
): void {
  const dirtyLeaves = editor._dirtyLeaves
  const nodeMap = editorState._nodeMap

  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey)

    if (
      $isTextNode(node) &&
      node.isAttached() &&
      node.isSimpleText() &&
      !node.isUnmergeable()
    ) {
      $normalizeTextNode(node)
    }
  }
}

/**
 * 모든 변환을 적용합니다.
 *
 * 변환 휴리스틱:
 * 1. 먼저 잎 노드(leaf)를 변환합니다. 만약 변환 중에 추가적으로 더티 노드가 생성되면 1단계를 반복합니다.
 *    - 잎 노드를 더티로 표시하면 해당 잎의 모든 부모 요소들도 더티로 표시되기 때문입니다.
 * 2. 요소(element)를 변환합니다. 요소 변환 중에 추가적으로 더티 노드가 생성되면 1단계를 반복합니다.
 *    - 요소 변환이 추가적으로 더티 요소만 생성할 경우 2단계만 반복합니다.
 *
 * 참고로 새롭게 더티 노드와 서브트리를 추적하기 위해 editor._dirtyNodes와 editor._subtrees를 매 루프마다 초기화합니다.
 *
 * @param editorState - 현재 에디터 상태를 나타내는 EditorState 객체.
 * @param editor - LexicalEditor 인스턴스.
 */
function $applyAllTransforms(
  editorState: EditorState,
  editor: LexicalEditor,
): void {
  const dirtyLeaves = editor._dirtyLeaves
  const dirtyElements = editor._dirtyElements
  const nodeMap = editorState._nodeMap
  const compositionKey = $getCompositionKey()
  const transformsCache = new Map()

  let untransformedDirtyLeaves = dirtyLeaves
  let untransformedDirtyLeavesLength = untransformedDirtyLeaves.size
  let untransformedDirtyElements = dirtyElements
  let untransformedDirtyElementsLength = untransformedDirtyElements.size

  while (
    untransformedDirtyLeavesLength > 0 ||
    untransformedDirtyElementsLength > 0
  ) {
    if (untransformedDirtyLeavesLength > 0) {
      // 변환 후 새롭게 더티가 된 잎 노드를 추적하기 위해 editor._dirtyLeaves를 사용합니다.
      editor._dirtyLeaves = new Set()

      for (const nodeKey of untransformedDirtyLeaves) {
        const node = nodeMap.get(nodeKey)

        if (
          $isTextNode(node) &&
          node.isAttached() &&
          node.isSimpleText() &&
          !node.isUnmergeable()
        ) {
          $normalizeTextNode(node)
        }

        if (
          node !== undefined &&
          $isNodeValidForTransform(node, compositionKey)
        ) {
          $applyTransforms(editor, node, transformsCache)
        }

        dirtyLeaves.add(nodeKey)
      }

      untransformedDirtyLeaves = editor._dirtyLeaves
      untransformedDirtyLeavesLength = untransformedDirtyLeaves.size

      // 요소 변환보다 노드 변환을 우선시합니다.
      if (untransformedDirtyLeavesLength > 0) {
        infiniteTransformCount++
        continue
      }
    }

    // 모든 더티 잎 노드가 처리되었습니다. 이제 요소를 처리합니다!
    // 이전에 더티 잎 노드를 처리했으므로 요소 변환으로 인해 발생한 새 잎 노드를 추적하기 위해 editor._dirtyLeaves Set를 초기화합니다.
    editor._dirtyLeaves = new Set()
    editor._dirtyElements = new Map()

    for (const currentUntransformedDirtyElement of untransformedDirtyElements) {
      const nodeKey = currentUntransformedDirtyElement[0]
      const intentionallyMarkedAsDirty = currentUntransformedDirtyElement[1]
      if (nodeKey !== 'root' && !intentionallyMarkedAsDirty) {
        continue
      }

      const node = nodeMap.get(nodeKey)

      if (
        node !== undefined &&
        $isNodeValidForTransform(node, compositionKey)
      ) {
        $applyTransforms(editor, node, transformsCache)
      }

      dirtyElements.set(nodeKey, intentionallyMarkedAsDirty)
    }

    untransformedDirtyLeaves = editor._dirtyLeaves
    untransformedDirtyLeavesLength = untransformedDirtyLeaves.size
    untransformedDirtyElements = editor._dirtyElements
    untransformedDirtyElementsLength = untransformedDirtyElements.size
    infiniteTransformCount++
  }

  editor._dirtyLeaves = dirtyLeaves
  editor._dirtyElements = dirtyElements
}

type InternalSerializedNode = {
  children?: Array<InternalSerializedNode>
  type: string
  version: number
}

/**
 * 주어진 SerializedLexicalNode를 파싱하여 LexicalNode로 변환합니다.
 *
 * @param serializedNode - 파싱할 SerializedLexicalNode 객체.
 * @returns LexicalNode로 변환된 결과.
 */
export function $parseSerializedNode(
  serializedNode: SerializedLexicalNode,
): LexicalNode {
  const internalSerializedNode: InternalSerializedNode = serializedNode
  return $parseSerializedNodeImpl(
    internalSerializedNode,
    getActiveEditor()._nodes,
  )
}

/**
 * 주어진 InternalSerializedNode 객체를 파싱하여 LexicalNode 객체로 변환하는 내부 구현 함수.
 *
 * @template SerializedNode - 내부 직렬화 노드의 타입.
 * @param serializedNode - 파싱할 InternalSerializedNode 객체.
 * @param registeredNodes - 노드 타입에 따라 등록된 노드를 포함하는 맵.
 * @returns LexicalNode로 변환된 결과.
 */
function $parseSerializedNodeImpl<
  SerializedNode extends InternalSerializedNode,
>(
  serializedNode: SerializedNode,
  registeredNodes: RegisteredNodes,
): LexicalNode {
  const type = serializedNode.type
  const registeredNode = registeredNodes.get(type)

  if (registeredNode === undefined) {
    invariant(false, 'parseEditorState: type "%s" + not found', type)
  }

  const nodeClass = registeredNode.klass

  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .importJSON().',
      nodeClass.name,
    )
  }

  const node = nodeClass.importJSON(serializedNode)
  const children = serializedNode.children

  if ($isElementNode(node) && Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const serializedJSONChildNode = children[i]
      const childNode = $parseSerializedNodeImpl(
        serializedJSONChildNode,
        registeredNodes,
      )
      node.append(childNode)
    }
  }

  return node
}

/**
 * 직렬화된 에디터 상태를 파싱하여 EditorState 객체를 생성하는 함수입니다.
 * 이 함수는 에디터의 상태를 재설정하고, 직렬화된 데이터를 기반으로 새로운 상태를 구축합니다.
 *
 * @param serializedEditorState - 직렬화된 에디터 상태 객체.
 * @param editor - 현재 에디터 인스턴스.
 * @param updateFn - 상태가 업데이트된 후 호출될 선택적 콜백 함수.
 * @returns 새로 생성된 EditorState 객체.
 */

export function parseEditorState(
  serializedEditorState: SerializedEditorState,
  editor: LexicalEditor,
  updateFn: void | (() => void),
): EditorState {
  const editorState = createEmptyEditorState()
  const previousActiveEditorState = activeEditorState
  const previousReadOnlyMode = isReadOnlyMode
  const previousActiveEditor = activeEditor
  const previousDirtyElements = editor._dirtyElements
  const previousDirtyLeaves = editor._dirtyLeaves
  const previousCloneNotNeeded = editor._cloneNotNeeded
  const previousDirtyType = editor._dirtyType
  editor._dirtyElements = new Map()
  editor._dirtyLeaves = new Set()
  editor._cloneNotNeeded = new Set()
  editor._dirtyType = 0
  activeEditorState = editorState
  isReadOnlyMode = false
  activeEditor = editor

  try {
    const registeredNodes = editor._nodes
    const serializedNode = serializedEditorState.root
    $parseSerializedNodeImpl(serializedNode, registeredNodes)
    if (updateFn) {
      updateFn()
    }

    // Make the editorState immutable
    editorState._readOnly = true

    if (__DEV__) {
      handleDEVOnlyPendingUpdateGuarantees(editorState)
    }
  } catch (error) {
    if (error instanceof Error) {
      editor._onError(error)
    }
  } finally {
    editor._dirtyElements = previousDirtyElements
    editor._dirtyLeaves = previousDirtyLeaves
    editor._cloneNotNeeded = previousCloneNotNeeded
    editor._dirtyType = previousDirtyType
    activeEditorState = previousActiveEditorState
    isReadOnlyMode = previousReadOnlyMode
    activeEditor = previousActiveEditor
  }

  return editorState
}

// 이 함수는 기술적으로 업데이트는 아니지만,
// 모듈의 활성 바인딩에 접근할 필요가 있기 때문에 이 함수가 존재합니다.

/**
 * 에디터 상태를 읽습니다. 주어진 콜백 함수를 읽기 전용 모드에서 실행합니다.
 *
 * @param editor - 활성화할 LexicalEditor 인스턴스입니다. null일 수 있습니다.
 * @param editorState - 읽기 전용으로 설정할 EditorState입니다.
 * @param callbackFn - 읽기 전용 에디터 상태에 접근할 수 있는 함수입니다.
 * @returns 콜백 함수의 반환값을 반환합니다.
 */
export function readEditorState<V>(
  editor: LexicalEditor | null,
  editorState: EditorState,
  callbackFn: () => V,
): V {
  const previousActiveEditorState = activeEditorState
  const previousReadOnlyMode = isReadOnlyMode
  const previousActiveEditor = activeEditor

  activeEditorState = editorState
  isReadOnlyMode = true
  activeEditor = editor

  try {
    return callbackFn()
  } finally {
    activeEditorState = previousActiveEditorState
    isReadOnlyMode = previousReadOnlyMode
    activeEditor = previousActiveEditor
  }
}

/**
 * 개발 모드에서만 수행되는, EditorState의 불변성을 보장하기 위한 함수입니다.
 * 이 함수는 노드 맵의 수정 작업을 방지하기 위해 `set`, `clear`, 및 `delete` 메서드를 재정의합니다.
 *
 * @param pendingEditorState - 불변성을 보장할 EditorState 객체.
 *
 * @throws Error - 노드 맵이 수정될 경우 오류를 발생시킵니다.
 */
function handleDEVOnlyPendingUpdateGuarantees(
  pendingEditorState: EditorState,
): void {
  // Given we can't Object.freeze the nodeMap as it's a Map,
  // we instead replace its set, clear and delete methods.
  const nodeMap = pendingEditorState._nodeMap

  nodeMap.set = () => {
    throw new Error('Cannot call set() on a frozen Lexical node map')
  }

  nodeMap.clear = () => {
    throw new Error('Cannot call clear() on a frozen Lexical node map')
  }

  nodeMap.delete = () => {
    throw new Error('Cannot call delete() on a frozen Lexical node map')
  }
}
/**
 * 커밋 대기 중인 업데이트를 처리하는 함수입니다.
 * 이 함수는 잠재적인 DOM 업데이트와 상태 변경을 수행하며, 오류 발생 시 복구를 시도합니다.
 *
 * @param editor - 현재의 LexicalEditor 인스턴스.
 * @param recoveryEditorState - 선택적 복구용 EditorState. 오류 발생 시 이전 상태로 복구합니다.
 *
 * @returns void
 */
export function $commitPendingUpdates(
  editor: LexicalEditor,
  recoveryEditorState?: EditorState,
): void {
  const pendingEditorState = editor._pendingEditorState
  const rootElement = editor._rootElement
  const shouldSkipDOM = editor._headless || rootElement === null

  if (pendingEditorState === null) {
    return
  }

  // ======
  // Reconciliation has started.
  // ======

  const currentEditorState = editor._editorState
  const currentSelection = currentEditorState._selection
  const pendingSelection = pendingEditorState._selection
  const needsUpdate = editor._dirtyType !== NO_DIRTY_NODES
  const previousActiveEditorState = activeEditorState
  const previousReadOnlyMode = isReadOnlyMode
  const previousActiveEditor = activeEditor
  const previouslyUpdating = editor._updating
  const observer = editor._observer
  let mutatedNodes = null
  editor._pendingEditorState = null
  editor._editorState = pendingEditorState

  if (!shouldSkipDOM && needsUpdate && observer !== null) {
    activeEditor = editor
    activeEditorState = pendingEditorState
    isReadOnlyMode = false
    // We don't want updates to sync block the reconciliation.
    editor._updating = true
    try {
      const dirtyType = editor._dirtyType
      const dirtyElements = editor._dirtyElements
      const dirtyLeaves = editor._dirtyLeaves
      observer.disconnect()

      mutatedNodes = $reconcileRoot(
        currentEditorState,
        pendingEditorState,
        editor,
        dirtyType,
        dirtyElements,
        dirtyLeaves,
      )
    } catch (error) {
      // Report errors
      if (error instanceof Error) {
        editor._onError(error)
      }

      // Reset editor and restore incoming editor state to the DOM
      if (!isAttemptingToRecoverFromReconcilerError) {
        resetEditor(editor, null, rootElement, pendingEditorState)
        initMutationObserver(editor)
        editor._dirtyType = FULL_RECONCILE
        isAttemptingToRecoverFromReconcilerError = true
        $commitPendingUpdates(editor, currentEditorState)
        isAttemptingToRecoverFromReconcilerError = false
      } else {
        // To avoid a possible situation of infinite loops, lets throw
        throw error
      }

      return
    } finally {
      observer.observe(rootElement as Node, observerOptions)
      editor._updating = previouslyUpdating
      activeEditorState = previousActiveEditorState
      isReadOnlyMode = previousReadOnlyMode
      activeEditor = previousActiveEditor
    }
  }

  if (!pendingEditorState._readOnly) {
    pendingEditorState._readOnly = true
    if (__DEV__) {
      handleDEVOnlyPendingUpdateGuarantees(pendingEditorState)
      if ($isRangeSelection(pendingSelection)) {
        Object.freeze(pendingSelection.anchor)
        Object.freeze(pendingSelection.focus)
      }
      Object.freeze(pendingSelection)
    }
  }

  const dirtyLeaves = editor._dirtyLeaves
  const dirtyElements = editor._dirtyElements
  const normalizedNodes = editor._normalizedNodes
  const tags = editor._updateTags
  const deferred = editor._deferred
  const nodeCount = pendingEditorState._nodeMap.size

  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES
    editor._cloneNotNeeded.clear()
    editor._dirtyLeaves = new Set()
    editor._dirtyElements = new Map()
    editor._normalizedNodes = new Set()
    editor._updateTags = new Set()
  }
  $garbageCollectDetachedDecorators(editor, pendingEditorState)

  // ======
  // Reconciliation has finished. Now update selection and trigger listeners.
  // ======

  const domSelection = shouldSkipDOM ? null : getDOMSelection(editor._window)

  // Attempt to update the DOM selection, including focusing of the root element,
  // and scroll into view if needed.
  if (
    editor._editable &&
    // domSelection will be null in headless
    domSelection !== null &&
    (needsUpdate || pendingSelection === null || pendingSelection.dirty)
  ) {
    activeEditor = editor
    activeEditorState = pendingEditorState
    try {
      if (observer !== null) {
        observer.disconnect()
      }
      if (needsUpdate || pendingSelection === null || pendingSelection.dirty) {
        const blockCursorElement = editor._blockCursorElement
        if (blockCursorElement !== null) {
          removeDOMBlockCursorElement(
            blockCursorElement,
            editor,
            rootElement as HTMLElement,
          )
        }
        updateDOMSelection(
          currentSelection,
          pendingSelection,
          editor,
          domSelection,
          tags,
          rootElement as HTMLElement,
          nodeCount,
        )
      }
      updateDOMBlockCursorElement(
        editor,
        rootElement as HTMLElement,
        pendingSelection,
      )
      if (observer !== null) {
        observer.observe(rootElement as Node, observerOptions)
      }
    } finally {
      activeEditor = previousActiveEditor
      activeEditorState = previousActiveEditorState
    }
  }

  if (mutatedNodes !== null) {
    triggerMutationListeners(
      editor,
      mutatedNodes,
      tags,
      dirtyLeaves,
      currentEditorState,
    )
  }
  if (
    !$isRangeSelection(pendingSelection) &&
    pendingSelection !== null &&
    (currentSelection === null || !currentSelection.is(pendingSelection))
  ) {
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined)
  }
  /**
   * Capture pendingDecorators after garbage collecting detached decorators
   */
  const pendingDecorators = editor._pendingDecorators
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators
    editor._pendingDecorators = null
    triggerListeners('decorator', editor, true, pendingDecorators)
  }

  // If reconciler fails, we reset whole editor (so current editor state becomes empty)
  // and attempt to re-render pendingEditorState. If that goes through we trigger
  // listeners, but instead use recoverEditorState which is current editor state before reset
  // This specifically important for collab that relies on prevEditorState from update
  // listener to calculate delta of changed nodes/properties
  triggerTextContentListeners(
    editor,
    recoveryEditorState || currentEditorState,
    pendingEditorState,
  )
  triggerListeners('update', editor, true, {
    dirtyElements,
    dirtyLeaves,
    editorState: pendingEditorState,
    normalizedNodes,
    prevEditorState: recoveryEditorState || currentEditorState,
    tags,
  })
  triggerDeferredUpdateCallbacks(editor, deferred)
  $triggerEnqueuedUpdates(editor)
}

/**
 * 텍스트 콘텐츠 리스너를 트리거합니다.
 *
 * 이 함수는 현재 편집기 상태와 대기 중인 편집기 상태의 텍스트 콘텐츠를 비교하여
 * 텍스트 콘텐츠가 변경된 경우, 'textcontent' 리스너를 호출합니다.
 *
 * @param editor - 현재 편집기 인스턴스입니다.
 * @param currentEditorState - 현재 편집기 상태입니다.
 * @param pendingEditorState - 대기 중인 편집기 상태입니다.
 *
 * @returns void
 */
function triggerTextContentListeners(
  editor: LexicalEditor,
  currentEditorState: EditorState,
  pendingEditorState: EditorState,
): void {
  const currentTextContent = getEditorStateTextContent(currentEditorState)
  const latestTextContent = getEditorStateTextContent(pendingEditorState)

  if (currentTextContent !== latestTextContent) {
    triggerListeners('textcontent', editor, true, latestTextContent)
  }
}

/**
 * 변형된 노드와 관련된 뮤테이션 리스너를 트리거합니다.
 *
 * 이 함수는 편집기에서 변형된 노드를 감지하고, 해당 노드에 대해 등록된 모든 뮤테이션 리스너를 호출합니다.
 * 각 리스너는 변형된 노드와 함께 추가적인 정보(더러운 리프, 이전 편집기 상태, 업데이트 태그 등)를 수신합니다.
 *
 * @param editor - 현재 편집기 인스턴스입니다.
 * @param mutatedNodes - 변형된 노드의 맵입니다. 각 타입의 노드를 키로 사용하여, 변형된 노드를 값으로 저장합니다.
 * @param updateTags - 업데이트 태그의 집합입니다. 변형된 노드에 관련된 태그를 포함합니다.
 * @param dirtyLeaves - 더러운 리프의 집합입니다. 변형된 노드에 따라 변경된 리프를 포함합니다.
 * @param prevEditorState - 이전 편집기 상태입니다. 변형된 노드와의 비교를 위해 사용됩니다.
 *
 * @returns void
 */
function triggerMutationListeners(
  editor: LexicalEditor,
  mutatedNodes: MutatedNodes,
  updateTags: Set<string>,
  dirtyLeaves: Set<string>,
  prevEditorState: EditorState,
): void {
  const listeners = Array.from(editor._listeners.mutation)
  const listenersLength = listeners.length

  for (let i = 0; i < listenersLength; i++) {
    const [listener, klass] = listeners[i]
    const mutatedNodesByType = mutatedNodes.get(klass)
    if (mutatedNodesByType !== undefined) {
      listener(mutatedNodesByType, {
        dirtyLeaves,
        prevEditorState,
        updateTags,
      })
    }
  }
}

/**
 * 특정 타입의 리스너를 트리거하고, 추가적인 데이터를 전달합니다.
 *
 * 이 함수는 편집기에서 등록된 리스너를 호출하여 특정 이벤트를 발생시키고, 필요한 데이터를 전달합니다.
 * 리스너 호출 시, 현재 업데이트를 큐에 추가 중인지 여부에 따라 `_updating` 플래그를 조정합니다.
 *
 * @param type - 트리거할 이벤트의 타입입니다. 가능한 값은 `'update'`, `'root'`, `'decorator'`, `'textcontent'`, `'editable'`입니다.
 * @param editor - 현재 편집기 인스턴스입니다.
 * @param isCurrentlyEnqueuingUpdates - 현재 업데이트를 큐에 추가 중인지 여부를 나타내는 불리언 값입니다.
 * @param payload - 리스너에 전달할 추가적인 데이터입니다. 여러 개의 인자를 받을 수 있습니다.
 *
 * @returns void
 */

export function triggerListeners(
  type: 'update' | 'root' | 'decorator' | 'textcontent' | 'editable',
  editor: LexicalEditor,
  isCurrentlyEnqueuingUpdates: boolean,
  ...payload: unknown[]
): void {
  const previouslyUpdating = editor._updating
  editor._updating = isCurrentlyEnqueuingUpdates

  try {
    const listeners = Array.from<Listener>(editor._listeners[type])
    for (let i = 0; i < listeners.length; i++) {
      // @ts-ignore
      listeners[i].apply(null, payload)
    }
  } finally {
    editor._updating = previouslyUpdating
  }
}

/**
 * 명령어 리스너를 트리거하고 해당 명령어에 대한 리스너가 있는지 확인합니다.
 *
 * 이 함수는 지정된 명령어 타입에 대한 리스너를 호출하고, 리스너 중 하나라도 `true`를 반환하면 즉시 `true`를 반환합니다.
 * `editor._updating`이 `false`일 때는, 편집기를 업데이트 후 재귀적으로 호출합니다.
 *
 * @template TCommand - 명령어 타입을 제네릭으로 받습니다.
 * @param editor - 현재 편집기 인스턴스입니다.
 * @param type - 호출할 명령어의 타입입니다. `LexicalCommand<unknown>` 타입을 가집니다.
 * @param payload - 명령어에 전달할 데이터입니다. `CommandPayloadType<TCommand>` 타입입니다.
 *
 * @returns boolean - 리스너 중 하나라도 `true`를 반환하면 `true`, 그렇지 않으면 `false`를 반환합니다.
 */
export function triggerCommandListeners<
  TCommand extends LexicalCommand<unknown>,
>(
  editor: LexicalEditor,
  type: TCommand,
  payload: CommandPayloadType<TCommand>,
): boolean {
  if (editor._updating === false || activeEditor !== editor) {
    let returnVal = false
    editor.update(() => {
      returnVal = triggerCommandListeners(editor, type, payload)
    })
    return returnVal
  }

  const editors = getEditorsToPropagate(editor)

  for (let i = 4; i >= 0; i--) {
    for (let e = 0; e < editors.length; e++) {
      const currentEditor = editors[e]
      const commandListeners = currentEditor._commands
      const listenerInPriorityOrder = commandListeners.get(type)

      if (listenerInPriorityOrder !== undefined) {
        const listenersSet = listenerInPriorityOrder[i]

        if (listenersSet !== undefined) {
          const listeners = Array.from(listenersSet)
          const listenersLength = listeners.length

          for (let j = 0; j < listenersLength; j++) {
            if (listeners[j](payload, editor) === true) {
              return true
            }
          }
        }
      }
    }
  }

  return false
}

/**
 * 대기 중인 업데이트를 트리거합니다.
 *
 * 이 함수는 편집기의 대기열에서 업데이트를 하나 가져와 실행합니다. 대기 중인 업데이트가 없는 경우, 아무 작업도 수행하지 않습니다.
 *
 * @param editor - 현재 `LexicalEditor` 인스턴스입니다.
 */
function $triggerEnqueuedUpdates(editor: LexicalEditor): void {
  const queuedUpdates = editor._updates

  if (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift()
    if (queuedUpdate) {
      const [updateFn, options] = queuedUpdate
      $beginUpdate(editor, updateFn, options)
    }
  }
}

/**
 * 지연된 업데이트 콜백 함수를 트리거합니다.
 *
 * 이 함수는 지연된 콜백 배열을 순회하며, 각 콜백을 호출합니다. 호출이 완료된 후, 업데이트 상태를 복원합니다.
 *
 * @param editor - 현재 `LexicalEditor` 인스턴스입니다.
 * @param deferred - 실행할 지연된 콜백 함수들의 배열입니다.
 */
function triggerDeferredUpdateCallbacks(
  editor: LexicalEditor,
  deferred: Array<() => void>,
): void {
  editor._deferred = []

  if (deferred.length !== 0) {
    const previouslyUpdating = editor._updating
    editor._updating = true

    try {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]()
      }
    } finally {
      editor._updating = previouslyUpdating
    }
  }
}

/**
 * 중첩된 업데이트를 처리합니다.
 *
 * 이 함수는 업데이트 큐에서 업데이트를 처리하고, 각 업데이트의 옵션에 따라 추가적인 작업을 수행합니다.
 * 업데이트 큐가 비어 있을 때까지 계속해서 업데이트를 처리합니다.
 *
 * @param editor - 현재 `LexicalEditor` 인스턴스입니다.
 * @param initialSkipTransforms - 업데이트를 처리할 때 변환을 건너뛸지 여부를 설정합니다. 기본값은 `false`입니다.
 * @returns `boolean` - 변환을 건너뛰었는지 여부를 나타냅니다.
 */
function processNestedUpdates(
  editor: LexicalEditor,
  initialSkipTransforms?: boolean,
): boolean {
  const queuedUpdates = editor._updates
  let skipTransforms = initialSkipTransforms || false

  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift()
    if (queuedUpdate) {
      const [nextUpdateFn, options] = queuedUpdate

      let onUpdate
      let tag

      if (options !== undefined) {
        onUpdate = options.onUpdate
        tag = options.tag

        if (options.skipTransforms) {
          skipTransforms = true
        }
        if (options.discrete) {
          const pendingEditorState = editor._pendingEditorState
          invariant(
            pendingEditorState !== null,
            'Unexpected empty pending editor state on discrete nested update',
          )
          pendingEditorState._flushSync = true
        }

        if (onUpdate) {
          editor._deferred.push(onUpdate)
        }

        if (tag) {
          editor._updateTags.add(tag)
        }
      }

      nextUpdateFn()
    }
  }

  return skipTransforms
}

/**
 * 에디터의 업데이트를 시작하는 함수로, 상태 클로닝, 업데이트 처리, 오류 처리 등을 관리합니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 * @param updateFn - 업데이트를 수행할 함수입니다.
 * @param options - 업데이트 과정에 대한 선택적 설정입니다.
 */
function $beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): void {
  const updateTags = editor._updateTags
  let onUpdate
  let tag
  let skipTransforms = false
  let discrete = false

  if (options !== undefined) {
    onUpdate = options.onUpdate
    tag = options.tag

    if (tag != null) {
      updateTags.add(tag)
    }

    skipTransforms = options.skipTransforms || false
    discrete = options.discrete || false
  }

  if (onUpdate) {
    editor._deferred.push(onUpdate)
  }

  const currentEditorState = editor._editorState
  let pendingEditorState = editor._pendingEditorState
  let editorStateWasCloned = false

  if (pendingEditorState === null || pendingEditorState._readOnly) {
    pendingEditorState = editor._pendingEditorState = cloneEditorState(
      pendingEditorState || currentEditorState,
    )
    editorStateWasCloned = true
  }
  pendingEditorState._flushSync = discrete

  const previousActiveEditorState = activeEditorState
  const previousReadOnlyMode = isReadOnlyMode
  const previousActiveEditor = activeEditor
  const previouslyUpdating = editor._updating
  activeEditorState = pendingEditorState
  isReadOnlyMode = false
  editor._updating = true
  activeEditor = editor

  try {
    if (editorStateWasCloned) {
      if (editor._headless) {
        if (currentEditorState._selection !== null) {
          pendingEditorState._selection = currentEditorState._selection.clone()
        }
      } else {
        pendingEditorState._selection = $internalCreateSelection(editor)
      }
    }

    const startingCompositionKey = editor._compositionKey
    updateFn()
    skipTransforms = processNestedUpdates(editor, skipTransforms)
    applySelectionTransforms(pendingEditorState, editor)

    if (editor._dirtyType !== NO_DIRTY_NODES) {
      if (skipTransforms) {
        $normalizeAllDirtyTextNodes(pendingEditorState, editor)
      } else {
        $applyAllTransforms(pendingEditorState, editor)
      }

      processNestedUpdates(editor)
      $garbageCollectDetachedNodes(
        currentEditorState,
        pendingEditorState,
        editor._dirtyLeaves,
        editor._dirtyElements,
      )
    }

    const endingCompositionKey = editor._compositionKey

    if (startingCompositionKey !== endingCompositionKey) {
      pendingEditorState._flushSync = true
    }

    const pendingSelection = pendingEditorState._selection

    if ($isRangeSelection(pendingSelection)) {
      const pendingNodeMap = pendingEditorState._nodeMap
      const anchorKey = pendingSelection.anchor.key
      const focusKey = pendingSelection.focus.key

      if (
        pendingNodeMap.get(anchorKey) === undefined ||
        pendingNodeMap.get(focusKey) === undefined
      ) {
        invariant(
          false,
          'updateEditor: selection has been lost because the previously selected nodes have been removed and ' +
            "selection wasn't moved to another node. Ensure selection changes after removing/replacing a selected node.",
        )
      }
    } else if ($isNodeSelection(pendingSelection)) {
      // TODO: we should also validate node selection?
      if (pendingSelection._nodes.size === 0) {
        pendingEditorState._selection = null
      }
    }
  } catch (error) {
    // Report errors
    if (error instanceof Error) {
      editor._onError(error)
    }

    // Restore existing editor state to the DOM
    editor._pendingEditorState = currentEditorState
    editor._dirtyType = FULL_RECONCILE

    editor._cloneNotNeeded.clear()

    editor._dirtyLeaves = new Set()

    editor._dirtyElements.clear()

    $commitPendingUpdates(editor)
    return
  } finally {
    activeEditorState = previousActiveEditorState
    isReadOnlyMode = previousReadOnlyMode
    activeEditor = previousActiveEditor
    editor._updating = previouslyUpdating
    infiniteTransformCount = 0
  }

  const shouldUpdate =
    editor._dirtyType !== NO_DIRTY_NODES ||
    editorStateHasDirtySelection(pendingEditorState, editor)

  if (shouldUpdate) {
    if (pendingEditorState._flushSync) {
      pendingEditorState._flushSync = false
      $commitPendingUpdates(editor)
    } else if (editorStateWasCloned) {
      scheduleMicroTask(() => {
        $commitPendingUpdates(editor)
      })
    }
  } else {
    pendingEditorState._flushSync = false

    if (editorStateWasCloned) {
      updateTags.clear()
      editor._deferred = []
      editor._pendingEditorState = null
    }
  }
}

/**
 * 에디터의 업데이트를 예약하거나 즉시 시작합니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 * @param updateFn - 업데이트를 수행할 함수입니다.
 * @param options - 업데이트 과정에 대한 선택적 설정입니다.
 */
export function updateEditor(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): void {
  if (editor._updating) {
    editor._updates.push([updateFn, options])
  } else {
    $beginUpdate(editor, updateFn, options)
  }
}

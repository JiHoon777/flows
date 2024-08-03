import type { LexicalCommand } from '@/lib/lexical/lexical-commands.ts'
import {
  createEmptyEditorState,
  EditorState,
  SerializedEditorState,
} from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  CommandPayloadType,
  EditorUpdateOptions,
} from '@/lib/lexical/lexical-editor.type.ts'

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

export function internalGetActiveEditorState(): EditorState | null {
  return activeEditorState
}

export function triggerCommandListeners<
  TCommand extends LexicalCommand<unknown>,
>(
  editor: LexicalEditor,
  type: TCommand,
  payload: CommandPayloadType<TCommand>,
): boolean {
  return false
}

/**
 * 에디터를 업데이트합니다.
 *
 * @param editor - 업데이트할 LexicalEditor 인스턴스입니다.
 * @param updateFn - 업데이트 시 실행할 함수입니다.
 * @param options - 업데이트 옵션입니다.
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

function $beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  options?: EditorUpdateOptions,
): void {}

export function $commitPendingUpdates(
  editor: LexicalEditor,
  recoveryEditorState?: EditorState,
): void {}

export function triggerListeners(
  type: 'update' | 'root' | 'decorator' | 'textcontent' | 'editable',
  editor: LexicalEditor,
  isCurrentlyEnqueuingUpdates: boolean,
  ...payload: unknown[]
): void {}

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

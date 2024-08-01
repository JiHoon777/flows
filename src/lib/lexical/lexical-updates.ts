import { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import invariant from '@/utils/invariant.ts'

const activeEditorState: null | EditorState = null
const activeEditor: null | LexicalEditor = null
const isReadOnlyMode = false
const isAttemptingToRecoverFromReconcilerError = false
const infiniteTransformCount = 0

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

import type { SerializedRootNode } from './nodes/lexical-root-node'
import { $createRootNode } from './nodes/lexical-root-node'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  NodeMap,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type { BaseSelection } from '@/lib/lexical/lexical-selection.ts'

import { readEditorState } from '@/lib/lexical/lexical-updates.ts'

export interface SerializedEditorState<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> {
  root: SerializedRootNode<T>
}

export interface EditorStateReadOptions {
  editor?: LexicalEditor | null
}

export class EditorState {
  _nodeMap: NodeMap
  _selection: null | BaseSelection
  _flushSync: boolean
  _readOnly: boolean

  constructor(nodeMap: NodeMap) {
    this._nodeMap = nodeMap
    this._selection = null
    this._flushSync = false
    this._readOnly = false
  }

  isEmpty(): boolean {
    return false
  }

  /**
   * 에디터 상태를 읽는 작업을 실행합니다. 이 함수는 에디터 컨텍스트를 사용할 수 있게 하며
   * (내보내기 및 읽기 전용 DOM 작업에 유용합니다) 에디터 상태의 변이를 방지합니다.
   *
   * @param callbackFn - 읽기 전용 에디터 상태에 접근할 수 있는 함수입니다.
   * @param options - 선택적인 에디터 상태 읽기 옵션입니다.
   * @returns 콜백 함수의 반환값을 반환합니다.
   */

  read<V>(callbackFn: () => V, options?: EditorStateReadOptions): V {
    return readEditorState(
      (options && options.editor) || null,
      this,
      callbackFn,
    )
  }
}

/**
 * 에디터 상태가 더티 선택을 가지고 있는지 확인합니다.
 *
 * @param editorState - 확인할 에디터 상태입니다.
 * @param editor - 확인할 LexicalEditor 인스턴스입니다.
 * @returns 선택 상태가 변경되었거나 더티 상태인 경우 true를 반환합니다. 그렇지 않으면 false를 반환합니다.
 */
export function editorStateHasDirtySelection(
  editorState: EditorState,
  editor: LexicalEditor,
): boolean {
  const currentSelection = editor.getEditorState()._selection

  const pendingSelection = editorState._selection

  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true
    }
  } else if (currentSelection !== null) {
    return true
  }

  return false
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', $createRootNode()]]))
}

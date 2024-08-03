import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  LexicalNode,
  NodeMap,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type { BaseSelection } from '@/lib/lexical/lexical-selection.ts'
import type { SerializedElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { SerializedRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'

import { readEditorState } from '@/lib/lexical/lexical-updates.ts'
import { $getRoot } from '@/lib/lexical/lexical-utils.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $createRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import invariant from '@/utils/invariant.ts'

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

  constructor(nodeMap: NodeMap, selection?: null | BaseSelection) {
    this._nodeMap = nodeMap
    this._selection = selection || null
    this._flushSync = false
    this._readOnly = false
  }

  /**
   * 에디터 상태가 비어 있는지 확인합니다.
   *
   * @returns 노드 맵에 루트 노드만 존재하고 선택 영역이 없는 경우 true를 반환합니다. 그렇지 않으면 false를 반환합니다.
   */
  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null
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
  /**
   * 현재 에디터 상태의 복제본을 생성합니다.
   *
   * @param selection - 선택적으로 설정할 선택 영역입니다. null일 수도 있습니다.
   * @returns 복제된 EditorState 객체를 반환합니다.
   */
  clone(selection?: null | BaseSelection): EditorState {
    const editorState = new EditorState(
      this._nodeMap,
      selection === undefined ? this._selection : selection,
    )
    editorState._readOnly = true

    return editorState
  }
  /**
   * 현재 에디터 상태를 직렬화된 JSON 형식으로 변환합니다.
   *
   * @returns 직렬화된 EditorState 객체를 반환합니다.
   */
  toJSON(): SerializedEditorState {
    return readEditorState(null, this, () => ({
      root: exportNodeToJSON($getRoot()),
    }))
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

export function cloneEditorState(current: EditorState): EditorState {
  return new EditorState(new Map(current._nodeMap))
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', $createRootNode()]]))
}

/**
 * LexicalNode를 직렬화된 JSON 형식으로 내보냅니다.
 *
 * @param node - 직렬화할 LexicalNode입니다.
 * @returns 직렬화된 노드를 반환합니다.
 */
function exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode,
): SerializedNode {
  const serializedNode = node.exportJSON()
  const nodeClass = node.constructor

  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.',
      nodeClass.name,
    )
  }

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children
    if (!Array.isArray(serializedChildren)) {
      invariant(
        false,
        'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
        nodeClass.name,
      )
    }

    const children = node.getChildren()

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const serializedChildNode = exportNodeToJSON(child)
      serializedChildren.push(serializedChildNode)
    }
  }

  // @ts-expect-error
  return serializedNode
}

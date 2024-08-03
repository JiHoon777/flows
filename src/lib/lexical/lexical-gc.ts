import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type { NodeKey, NodeMap } from '@/lib/lexical/lexical-node.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

import { cloneDecorators } from '@/lib/lexical/lexical-utils.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

/**
 * 분리된 데코레이터를 가비지 컬렉션합니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 * @param pendingEditorState - 처리할 대기 중인 EditorState입니다.
 */
export function $garbageCollectDetachedDecorators(
  editor: LexicalEditor,
  pendingEditorState: EditorState,
): void {
  const currentDecorators = editor._decorators
  const pendingDecorators = editor._pendingDecorators
  let decorators = pendingDecorators || currentDecorators
  const nodeMap = pendingEditorState._nodeMap
  let key

  for (key in decorators) {
    if (!nodeMap.has(key)) {
      if (decorators === currentDecorators) {
        decorators = cloneDecorators(editor)
      }

      delete decorators[key]
    }
  }
}

type IntentionallyMarkedAsDirtyElement = boolean
/**
 * 분리된 깊은 자식 노드를 가비지 컬렉션합니다.
 *
 * @param node - 처리할 부모 ElementNode입니다.
 * @param parentKey - 부모 노드의 키입니다.
 * @param prevNodeMap - 이전 노드 맵입니다.
 * @param nodeMap - 현재 노드 맵입니다.
 * @param nodeMapDelete - 삭제할 노드 키 배열입니다.
 * @param dirtyNodes - 더러운(dirty) 노드 맵입니다.
 */
function $garbageCollectDetachedDeepChildNodes(
  node: ElementNode,
  parentKey: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  nodeMapDelete: Array<NodeKey>,
  dirtyNodes: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let child = node.getFirstChild()

  while (child !== null) {
    const childKey = child.__key
    // TODO Revise condition below, redundant? LexicalNode already cleans up children when moving Nodes
    if (child.__parent === parentKey) {
      if ($isElementNode(child)) {
        $garbageCollectDetachedDeepChildNodes(
          child,
          childKey,
          prevNodeMap,
          nodeMap,
          nodeMapDelete,
          dirtyNodes,
        )
      }

      // If we have created a node and it was dereferenced, then also
      // remove it from out dirty nodes Set.
      if (!prevNodeMap.has(childKey)) {
        dirtyNodes.delete(childKey)
      }
      nodeMapDelete.push(childKey)
    }
    child = child.getNextSibling()
  }
}
/**
 * 분리된 노드를 가비지 컬렉션합니다.
 *
 * @param prevEditorState - 이전 에디터 상태입니다.
 * @param editorState - 현재 에디터 상태입니다.
 * @param dirtyLeaves - 더러운(dirty) 리프 노드의 키를 저장한 집합입니다.
 * @param dirtyElements - 더러운(dirty) 요소 노드의 키를 저장한 맵입니다.
 */
export function $garbageCollectDetachedNodes(
  prevEditorState: EditorState,
  editorState: EditorState,
  dirtyLeaves: Set<NodeKey>,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  const prevNodeMap = prevEditorState._nodeMap
  const nodeMap = editorState._nodeMap
  // Store dirtyElements in a queue for later deletion; deleting dirty subtrees too early will
  // hinder accessing .__next on child nodes
  const nodeMapDelete: Array<NodeKey> = []

  for (const [nodeKey] of dirtyElements) {
    const node = nodeMap.get(nodeKey)
    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if ($isElementNode(node)) {
          $garbageCollectDetachedDeepChildNodes(
            node,
            nodeKey,
            prevNodeMap,
            nodeMap,
            nodeMapDelete,
            dirtyElements,
          )
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyElements.delete(nodeKey)
        }
        nodeMapDelete.push(nodeKey)
      }
    }
  }
  for (const nodeKey of nodeMapDelete) {
    nodeMap.delete(nodeKey)
  }

  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey)
    if (node !== undefined && !node.isAttached()) {
      if (!prevNodeMap.has(nodeKey)) {
        dirtyLeaves.delete(nodeKey)
      }
      nodeMap.delete(nodeKey)
    }
  }
}

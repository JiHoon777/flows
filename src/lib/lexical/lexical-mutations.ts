import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type { BaseSelection } from '@/lib/lexical/lexical-selection.ts'
import type { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

import { DOM_TEXT_TYPE } from '@/lib/lexical/lexical-constants.ts'
import {
  $getSelection,
  $isRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import { updateEditor } from '@/lib/lexical/lexical-updates.ts'
import {
  $getNearestNodeFromDOMNode,
  $getNodeFromDOMNode,
  $setSelection,
  $updateTextNodeFromDOMContent,
  getDOMSelection,
  getWindow,
  internalGetRoot,
  isFirefoxClipboardEvents,
} from '@/lib/lexical/lexical-utils.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import { IS_FIREFOX } from '@/utils/environment.ts'

// 텍스트 입력 이벤트와 변이 관찰자가 실행되는 사이의 시간 간격입니다.
const TEXT_MUTATION_VARIANCE = 100

let isProcessingMutations = false
let lastTextEntryTimeStamp = 0

/**
 * 현재 변이 처리가 진행 중인지 여부를 반환합니다.
 *
 * @returns 변이 처리가 진행 중이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
export function getIsProcessingMutations(): boolean {
  return isProcessingMutations
}
/**
 * 이벤트의 타임스탬프를 업데이트합니다.
 *
 * @param event - 타임스탬프를 가져올 이벤트 객체입니다.
 */
function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp
}
/**
 * 텍스트 입력 리스너를 초기화합니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 */
function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true)
  }
}
/**
 * 관리되는 줄바꿈인지 확인합니다.
 *
 * @param dom - 확인할 DOM 노드입니다.
 * @param target - 대상 노드입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 * @returns 관리되는 줄바꿈이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
function isManagedLineBreak(
  dom: Node,
  target: Node,
  editor: LexicalEditor,
): boolean {
  return (
    // @ts-expect-error: internal field
    target.__lexicalLineBreak === dom ||
    // @ts-ignore We intentionally add this to the Node.
    dom[`__lexicalKey_${editor._key}`] !== undefined
  )
}
/**
 * 마지막 선택 영역을 가져옵니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 * @returns 마지막 선택 영역(BaseSelection) 또는 null을 반환합니다.
 */
function getLastSelection(editor: LexicalEditor): null | BaseSelection {
  return editor.getEditorState().read(() => {
    const selection = $getSelection()
    return selection !== null ? selection.clone() : null
  })
}
/**
 * 텍스트 변이를 처리합니다.
 *
 * @param target - 변이가 발생한 텍스트 노드입니다.
 * @param node - Lexical TextNode입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 */
function $handleTextMutation(
  target: Text,
  node: TextNode,
  editor: LexicalEditor,
): void {
  const domSelection = getDOMSelection(editor._window)
  let anchorOffset = null
  let focusOffset = null

  if (domSelection !== null && domSelection.anchorNode === target) {
    anchorOffset = domSelection.anchorOffset
    focusOffset = domSelection.focusOffset
  }

  const text = target.nodeValue
  if (text !== null) {
    $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false)
  }
}
/**
 * 변이로 인해 텍스트 노드를 업데이트해야 하는지 여부를 확인합니다.
 *
 * @desc 이 함수는 현재 선택 영역이 `RangeSelection`인지 확인하고,
 * 선택 영역의 앵커 노드가 대상 노드와 동일한지 그리고 선택 영역의 형식이 앵커 노드의 형식과 다른지를 확인합니다.
 * 그런 다음, 대상 DOM 노드가 텍스트 노드인지와 대상 Lexical 텍스트 노드가 연결되어 있는지를 확인합니다.
 * 이러한 조건을 통해 변이로 인해 텍스트 노드를 업데이트해야 하는지를 결정합니다.
 *
 * @param selection - 현재 선택 영역입니다.
 * @param targetDOM - 변이가 발생한 대상 DOM 노드입니다.
 * @param targetNode - 변이가 발생한 대상 Lexical TextNode입니다.
 * @returns 텍스트 노드를 업데이트해야 하면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
function shouldUpdateTextNodeFromMutation(
  selection: null | BaseSelection,
  targetDOM: Node,
  targetNode: TextNode,
): boolean {
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode()
    if (
      anchorNode.is(targetNode) &&
      selection.format !== anchorNode.getFormat()
    ) {
      return false
    }
  }
  return targetDOM.nodeType === DOM_TEXT_TYPE && targetNode.isAttached()
}
/**
 * 변이(mutation)들을 플러시합니다.
 *
 * @desc 이 함수는 에디터의 변이 관찰자(observer)로부터 받은 변이 기록을 처리하고,
 * 변이로 인해 변경된 DOM을 다시 Lexical 에디터의 상태로 되돌립니다.
 * Lexical 에디터의 상태가 항상 진리의 원천(source of truth)이 되도록 보장합니다.
 * 이 과정에서 브라우저가 자동으로 추가한 <br> 요소들을 제거하고,
 * Firefox와 같은 특정 브라우저의 특수한 케이스도 처리합니다.
 *
 * @param editor - LexicalEditor 인스턴스입니다.
 * @param mutations - 처리할 변이 기록의 배열입니다.
 * @param observer - 변이 관찰자(MutationObserver) 인스턴스입니다.
 */
export function $flushMutations(
  editor: LexicalEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {
  isProcessingMutations = true
  const shouldFlushTextMutations =
    performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE

  try {
    updateEditor(editor, () => {
      const selection = $getSelection() || getLastSelection(editor)
      const badDOMTargets = new Map()
      const rootElement = editor.getRootElement()
      // 현재 에디터 상태를 사용하여 화면에 표시되는 내용을 반영합니다.
      const currentEditorState = editor._editorState
      const blockCursorElement = editor._blockCursorElement
      let shouldRevertSelection = false
      let possibleTextForFirefoxPaste = ''

      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i]
        const type = mutation.type
        const targetDOM = mutation.target
        let targetNode = $getNearestNodeFromDOMNode(
          targetDOM,
          currentEditorState,
        )

        if (
          (targetNode === null && targetDOM !== rootElement) ||
          $isDecoratorNode(targetNode)
        ) {
          continue
        }

        if (type === 'characterData') {
          // 텍스트 변이는 지연 처리되고 변이 리스너에 전달되어
          // Lexical 엔진 외부에서 처리됩니다.
          if (
            shouldFlushTextMutations &&
            $isTextNode(targetNode) &&
            shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode)
          ) {
            $handleTextMutation(
              // nodeType === DOM_TEXT_TYPE는 텍스트 DOM 노드입니다.
              targetDOM as Text,
              targetNode,
              editor,
            )
          }
        } else if (type === 'childList') {
          shouldRevertSelection = true
          // Lexical 외부에서 발생한 변경 사항을 "되돌리려" 합니다.
          // Lexical의 에디터 상태가 진리의 원천(source of truth)이 되도록 합니다.
          // 사용자에게는 이러한 작업이 없는 것처럼 보일 것입니다.
          const addedDOMs = mutation.addedNodes

          for (let s = 0; s < addedDOMs.length; s++) {
            const addedDOM = addedDOMs[s]
            const node = $getNodeFromDOMNode(addedDOM)
            const parentDOM = addedDOM.parentNode

            if (
              parentDOM != null &&
              addedDOM !== blockCursorElement &&
              node === null &&
              (addedDOM.nodeName !== 'BR' ||
                !isManagedLineBreak(addedDOM, parentDOM, editor))
            ) {
              if (IS_FIREFOX) {
                const possibleText =
                  (addedDOM as HTMLElement).innerText || addedDOM.nodeValue

                if (possibleText) {
                  possibleTextForFirefoxPaste += possibleText
                }
              }

              parentDOM.removeChild(addedDOM)
            }
          }

          const removedDOMs = mutation.removedNodes
          const removedDOMsLength = removedDOMs.length

          if (removedDOMsLength > 0) {
            let unremovedBRs = 0

            for (let s = 0; s < removedDOMsLength; s++) {
              const removedDOM = removedDOMs[s]

              if (
                (removedDOM.nodeName === 'BR' &&
                  isManagedLineBreak(removedDOM, targetDOM, editor)) ||
                blockCursorElement === removedDOM
              ) {
                targetDOM.appendChild(removedDOM)
                unremovedBRs++
              }
            }

            if (removedDOMsLength !== unremovedBRs) {
              if (targetDOM === rootElement) {
                targetNode = internalGetRoot(currentEditorState)
              }

              badDOMTargets.set(targetDOM, targetNode)
            }
          }
        }
      }

      // 이제 각 고유한 대상 노드를 처리하여 내용을 다시 진리의 원천(source of truth)으로 복원하려고 합니다.
      // 이는 기본적으로 DOM에서 내부적으로 되돌리는 작업과 같습니다.
      if (badDOMTargets.size > 0) {
        for (const [targetDOM, targetNode] of badDOMTargets) {
          if ($isElementNode(targetNode)) {
            const childKeys = targetNode.getChildrenKeys()
            let currentDOM = targetDOM.firstChild

            for (let s = 0; s < childKeys.length; s++) {
              const key = childKeys[s]
              const correctDOM = editor.getElementByKey(key)

              if (correctDOM === null) {
                continue
              }

              if (currentDOM == null) {
                targetDOM.appendChild(correctDOM)
                currentDOM = correctDOM
              } else if (currentDOM !== correctDOM) {
                targetDOM.replaceChild(correctDOM, currentDOM)
              }

              currentDOM = currentDOM.nextSibling
            }
          } else if ($isTextNode(targetNode)) {
            targetNode.markDirty()
          }
        }
      }

      // 이 함수 동안 수행된 모든 변이를 캡처합니다.
      // 이렇게 하면 다음 onMutation 주기에서 이를 처리할 필요가 없습니다.
      // 이러한 변이는 우리가 만든 것이기 때문입니다.

      const records = observer.takeRecords()

      // 자동으로 추가된 <br> 요소를 찾아 제거합니다.
      // 이러한 요소는 위의 변이를 되돌릴 때 브라우저가 추가하며
      // 이로 인해 UI가 손상될 수 있습니다.
      if (records.length > 0) {
        for (let i = 0; i < records.length; i++) {
          const record = records[i]
          const addedNodes = record.addedNodes
          const target = record.target

          for (let s = 0; s < addedNodes.length; s++) {
            const addedDOM = addedNodes[s]
            const parentDOM = addedDOM.parentNode

            if (
              parentDOM != null &&
              addedDOM.nodeName === 'BR' &&
              !isManagedLineBreak(addedDOM, target, editor)
            ) {
              parentDOM.removeChild(addedDOM)
            }
          }
        }

        // Clear any of those removal mutations
        observer.takeRecords()
      }

      if (selection !== null) {
        if (shouldRevertSelection) {
          selection.dirty = true
          $setSelection(selection)
        }

        if (IS_FIREFOX && isFirefoxClipboardEvents(editor)) {
          selection.insertRawText(possibleTextForFirefoxPaste)
        }
      }
    })
  } finally {
    isProcessingMutations = false
  }
}

/**
 * 루트 변이를 플러시합니다.
 *
 * @param editor - 변이를 플러시할 LexicalEditor 인스턴스입니다.
 */
export function $flushRootMutations(editor: LexicalEditor): void {
  const observer = editor._observer

  if (observer !== null) {
    const mutations = observer.takeRecords()
    $flushMutations(editor, mutations, observer)
  }
}

/**
 * 에디터에 변이 관찰자를 초기화합니다.
 *
 * @param editor - 변이 관찰자를 초기화할 LexicalEditor 인스턴스입니다.
 */
export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor)
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer)
    },
  )
}

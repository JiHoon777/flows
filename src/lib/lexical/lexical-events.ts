import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'

import { CAN_USE_BEFORE_INPUT } from '@/utils/environment.ts'
import invariant from '@/utils/invariant.ts'
import { NodeKey } from '@/lib/lexical/lexical-node.ts'
import {
  $setSelection,
  getDOMSelection,
  getEditorsToPropagate,
  getNearestEditorFromDOMNode,
} from '@/lib/lexical/lexical-utils.ts'
import { updateEditor } from '@/lib/lexical/lexical-updates.ts'
import {
  $getPreviousSelection,
  $internalCreateRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import {
  DOM_ELEMENT_TYPE,
  DOM_TEXT_TYPE,
} from '@/lib/lexical/lexical-constants.ts'

type RootElementRemoveHandles = Array<() => void>
type RootElementEvents = Array<
  [
    string,
    Record<string, unknown> | ((event: Event, editor: LexicalEditor) => void),
  ]
>
const PASS_THROUGH_COMMAND = Object.freeze({})
const ANDROID_COMPOSITION_LATENCY = 30
const rootElementEvents: RootElementEvents = [
  ['keydown', onKeyDown],
  ['pointerdown', onPointerDown],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['input', onInput],
  ['click', onClick],
  ['cut', PASS_THROUGH_COMMAND],
  ['copy', PASS_THROUGH_COMMAND],
  ['dragstart', PASS_THROUGH_COMMAND],
  ['dragover', PASS_THROUGH_COMMAND],
  ['dragend', PASS_THROUGH_COMMAND],
  ['paste', PASS_THROUGH_COMMAND],
  ['focus', PASS_THROUGH_COMMAND],
  ['blur', PASS_THROUGH_COMMAND],
  ['drop', PASS_THROUGH_COMMAND],
]

if (CAN_USE_BEFORE_INPUT) {
  rootElementEvents.push([
    'beforeinput',
    (event, editor) => onBeforeInput(event as InputEvent, editor),
  ])
}

let lastKeyDownTimeStamp = 0
let lastKeyCode: null | string = null
let lastBeforeInputInsertTextTimeStamp = 0
let unprocessedBeforeInputData: null | string = null
const rootElementsRegistered = new WeakMap<Document, number>()
let isSelectionChangeFromDOMUpdate = false
let isSelectionChangeFromMouseDown = false
let isInsertLineBreak = false
let isFirefoxEndingComposition = false
let collapsedSelectionFormat: [number, string, number, NodeKey, number] = [
  0,
  '',
  0,
  'root',
  0,
]

// 루트 에디터를 활성 중첩 에디터에 매핑하는 맵입니다.
// 중첩 에디터 매핑만 포함하므로, 루트 에디터가 선택되면 메모리를 확보하기 위해 맵에 참조가 없습니다.
const activeNestedEditorsMap: Map<string, LexicalEditor> = new Map()

/**
 * 문서의 selectionchange 이벤트 핸들러입니다.
 *
 * @param event - selectionchange 이벤트 객체입니다.
 */
function onDocumentSelectionChange(event: Event): void {
  const target = event.target as null | Element | Document
  const targetWindow =
    target == null
      ? null
      : target.nodeType === 9
        ? (target as Document).defaultView
        : (target as Element).ownerDocument.defaultView
  const domSelection = getDOMSelection(targetWindow)
  if (domSelection === null) {
    return
  }
  const nextActiveEditor = getNearestEditorFromDOMNode(domSelection.anchorNode)
  if (nextActiveEditor === null) {
    return
  }

  if (isSelectionChangeFromMouseDown) {
    isSelectionChangeFromMouseDown = false
    updateEditor(nextActiveEditor, () => {
      const lastSelection = $getPreviousSelection()
      const domAnchorNode = domSelection.anchorNode
      if (domAnchorNode === null) {
        return
      }
      const nodeType = domAnchorNode.nodeType
      // If the user is attempting to click selection back onto text, then
      // we should attempt create a range selection.
      // When we click on an empty paragraph node or the end of a paragraph that ends
      // with an image/poll, the nodeType will be ELEMENT_NODE
      if (nodeType !== DOM_ELEMENT_TYPE && nodeType !== DOM_TEXT_TYPE) {
        return
      }
      const newSelection = $internalCreateRangeSelection(
        lastSelection,
        domSelection,
        nextActiveEditor,
        event,
      )
      $setSelection(newSelection)
    })
  }
}

/**
 * 루트 요소에서 이벤트를 제거합니다.
 *
 * @param rootElement - 이벤트를 제거할 루트 요소입니다.
 */
export function removeRootElementEvents(rootElement: HTMLElement): void {
  const doc = rootElement.ownerDocument
  const documentRootElementsCount = rootElementsRegistered.get(doc)
  invariant(
    documentRootElementsCount !== undefined,
    'Root element not registered',
  )

  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  const newCount = documentRootElementsCount - 1
  invariant(newCount >= 0, 'Root element count less than 0')
  rootElementsRegistered.set(doc, newCount)
  if (newCount === 0) {
    doc.removeEventListener('selectionchange', onDocumentSelectionChange)
  }

  // @ts-expect-error: internal field
  const editor: LexicalEditor | null | undefined = rootElement.__lexicalEditor

  if (editor !== null && editor !== undefined) {
    cleanActiveNestedEditorsMap(editor)
    // @ts-expect-error: internal field
    rootElement.__lexicalEditor = null
  }

  const removeHandles = getRootElementRemoveHandles(rootElement)

  for (let i = 0; i < removeHandles.length; i++) {
    removeHandles[i]()
  }

  // @ts-expect-error: internal field
  rootElement.__lexicalEventHandles = []
}

function cleanActiveNestedEditorsMap(editor: LexicalEditor) {
  if (editor._parentEditor !== null) {
    // For nested editor cleanup map if this editor was marked as active
    const editors = getEditorsToPropagate(editor)
    const rootEditor = editors[editors.length - 1]
    const rootEditorKey = rootEditor._key

    if (activeNestedEditorsMap.get(rootEditorKey) === editor) {
      activeNestedEditorsMap.delete(rootEditorKey)
    }
  } else {
    // For top-level editors cleanup map
    activeNestedEditorsMap.delete(editor._key)
  }
}

function getRootElementRemoveHandles(
  rootElement: HTMLElement,
): RootElementRemoveHandles {
  // @ts-expect-error: internal field
  let eventHandles = rootElement.__lexicalEventHandles

  if (eventHandles === undefined) {
    eventHandles = []
    // @ts-expect-error: internal field
    rootElement.__lexicalEventHandles = eventHandles
  }

  return eventHandles
}

export function addRootElementEvents(
  rootElement: HTMLElement,
  editor: LexicalEditor,
): void {}

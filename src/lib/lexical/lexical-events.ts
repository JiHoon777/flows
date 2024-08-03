import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type { NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { RangeSelection } from '@/lib/lexical/lexical-selection.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'

import {
  BLUR_COMMAND,
  CLICK_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGEND_COMMAND,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  MOVE_TO_END,
  MOVE_TO_START,
  PASTE_COMMAND,
  REDO_COMMAND,
  REMOVE_TEXT_COMMAND,
  SELECT_ALL_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from '@/lib/lexical/lexical-commands.ts'
import {
  COMPOSITION_START_CHAR,
  DOM_ELEMENT_TYPE,
  DOM_TEXT_TYPE,
  DOUBLE_LINE_BREAK,
  IS_ALL_FORMATTING,
} from '@/lib/lexical/lexical-constants.ts'
import { $getNodeByKey } from '@/lib/lexical/lexical-node.ts'
import {
  $getPreviousSelection,
  $getSelection,
  $internalCreateRangeSelection,
  $isNodeSelection,
  $isRangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import { getActiveEditor, updateEditor } from '@/lib/lexical/lexical-updates.ts'
import {
  $flushMutations,
  $getRoot,
  $isSelectionCapturedInDecorator,
  $isTokenOrSegmented,
  $setCompositionKey,
  $setSelection,
  $shouldInsertTextAfterOrBeforeTextNode,
  $updateSelectedTextFromDOM,
  $updateTextNodeFromDOMContent,
  dispatchCommand,
  doesContainGrapheme,
  getAnchorTextFromDOM,
  getDOMSelection,
  getDOMTextNode,
  getEditorsToPropagate,
  getNearestEditorFromDOMNode,
  getWindow,
  isBackspace,
  isBold,
  isCopy,
  isCut,
  isDelete,
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isEscape,
  isFirefoxClipboardEvents,
  isItalic,
  isLineBreak,
  isModifier,
  isMoveBackward,
  isMoveDown,
  isMoveForward,
  isMoveToEnd,
  isMoveToStart,
  isMoveUp,
  isOpenLineBreak,
  isParagraph,
  isRedo,
  isSelectAll,
  isSelectionWithinEditor,
  isSpace,
  isTab,
  isUnderline,
  isUndo,
} from '@/lib/lexical/lexical-utils.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { ParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import {
  CAN_USE_BEFORE_INPUT,
  IS_ANDROID_CHROME,
  IS_APPLE_WEBKIT,
  IS_FIREFOX,
  IS_IOS,
  IS_SAFARI,
} from '@/utils/environment.ts'
import invariant from '@/utils/invariant.ts'

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

/**
 * Lexical이 텍스트 삽입에 대한 기본 브라우저 동작을 재정의하고
 * 자체 내부 휴리스틱을 사용해야 하는지 결정하는 함수입니다.
 *
 * @param selection - 현재 선택 범위
 * @param domTargetRange - DOM 대상 범위
 * @param text - 삽입할 텍스트
 * @param timeStamp - 이벤트 타임스탬프
 * @param isBeforeInput - beforeinput 이벤트 여부
 * @returns 기본 동작을 방지하고 Lexical의 내부 로직을 사용해야 하면 true, 아니면 false
 *
 * @description
 * 이 함수는 Lexical의 핵심 기능 중 하나로, 다양한 브라우저와 단어, 줄, 문자 경계/형식에 걸쳐
 * Lexical이 의도한 대로 작동하게 하는 데 매우 중요합니다. 또한 텍스트 대체, 노드 스키마,
 * 그리고 조합(composition) 메커니즘에도 중요한 역할을 합니다.
 *
 * 주요 검사 항목:
 * 1. 선택 영역의 시작과 끝이 다른 노드에 있는 경우
 * 2. 비텍스트 노드 작업 시
 * 3. 범위를 단일 문자나 그래핌으로 대체하는 경우 (조합 중이 아닐 때)
 * 4. 토큰화되거나 분할된 텍스트 노드 처리 시
 * 5. DOM 선택과 Lexical의 내부 상태가 불일치할 때
 * 6. 포맷이나 스타일 변경 시
 * 7. 텍스트 노드 앞뒤 삽입 시 특별한 처리가 필요한 경우
 *
 * 이 함수는 복잡한 조건들을 검사하여 Lexical이 텍스트 삽입을 직접 제어해야 하는 상황을
 * 정확히 파악합니다. 이를 통해 일관된 편집 경험과 정확한 문서 상태를 유지합니다.
 */
function $shouldPreventDefaultAndInsertText(
  selection: RangeSelection,
  domTargetRange: null | StaticRange,
  text: string,
  timeStamp: number,
  isBeforeInput: boolean,
): boolean {
  const anchor = selection.anchor
  const focus = selection.focus
  const anchorNode = anchor.getNode()
  const editor = getActiveEditor()
  const domSelection = getDOMSelection(editor._window)
  const domAnchorNode = domSelection !== null ? domSelection.anchorNode : null
  const anchorKey = anchor.key
  const backingAnchorElement = editor.getElementByKey(anchorKey)
  const textLength = text.length

  return (
    // 선택 영역의 시작과 끝이 다른 노드에 있는 경우
    anchorKey !== focus.key ||
    // 비텍스트 노드에 대한 작업인 경우
    !$isTextNode(anchorNode) ||
    // 범위를 단일 문자나 그래핌으로 대체하는 경우 (조합 중이 아닐 때)
    (((!isBeforeInput &&
      (!CAN_USE_BEFORE_INPUT ||
        // 최근 50ms 이내에 "textInput"에 대한 beforeinput 이벤트가 있었는지 확인
        // 없었다면 execCommand('insertText')로 인한 지연된 'input' 이벤트일 가능성 있음
        lastBeforeInputInsertTextTimeStamp < timeStamp + 50)) ||
      (anchorNode.isDirty() && textLength < 2) ||
      doesContainGrapheme(text)) &&
      anchor.offset !== focus.offset &&
      !anchorNode.isComposing()) ||
    // 토큰화되거나 분할된 텍스트 노드 확인
    $isTokenOrSegmented(anchorNode) ||
    // 텍스트 길이가 1보다 크고 노드가 최근에 변경된 경우 (dirty 상태)
    (anchorNode.isDirty() && textLength > 1) ||
    // beforeinput 중 DOM 선택 요소가 백킹 노드와 다른 경우
    ((isBeforeInput || !CAN_USE_BEFORE_INPUT) &&
      backingAnchorElement !== null &&
      !anchorNode.isComposing() &&
      domAnchorNode !== getDOMTextNode(backingAnchorElement)) ||
    // TargetRange가 DOM 선택과 다른 경우 (브라우저가 에디터의 임의 부분을 편집하려는 시도)
    (domSelection !== null &&
      domTargetRange !== null &&
      (!domTargetRange.collapsed ||
        domTargetRange.startContainer !== domSelection.anchorNode ||
        domTargetRange.startOffset !== domSelection.anchorOffset)) ||
    // 포맷 변경 확인 (예: 굵게에서 이탤릭으로)
    anchorNode.getFormat() !== selection.format ||
    anchorNode.getStyle() !== selection.style ||
    // 텍스트 노드 앞뒤 삽입에 대한 추가 휴리스틱 검사
    $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode)
  )
}
/**
 * 선택 변경을 건너뛰어야 하는지 판단하는 함수입니다.
 *
 * @param domNode - 검사할 DOM 노드
 * @param offset - 선택 오프셋
 * @returns 선택 변경을 건너뛰어야 하면 true, 그렇지 않으면 false
 *
 * @description
 * 이 함수는 특정 조건에서 선택 변경 처리를 건너뛰어야 하는지 결정합니다.
 * 주로 텍스트 노드 내부의 선택에 대해 불필요한 처리를 방지하는 데 사용됩니다.
 */
function shouldSkipSelectionChange(
  domNode: null | Node,
  offset: number,
): boolean {
  return (
    // DOM 노드가 존재하고
    domNode !== null &&
    // 노드의 텍스트 값이 존재하며
    domNode.nodeValue !== null &&
    // 노드 타입이 텍스트 노드이고
    domNode.nodeType === DOM_TEXT_TYPE &&
    // 오프셋이 텍스트의 시작(0)이 아니며
    offset !== 0 &&
    // 오프셋이 텍스트의 끝이 아닌 경우
    offset !== domNode.nodeValue.length
  )
}
/**
 * DOM 선택 변경에 대응하여 Lexical 에디터의 선택 상태를 업데이트하는 함수입니다.
 *
 * @param domSelection - 현재 DOM 선택 객체
 * @param editor - Lexical 에디터 인스턴스
 * @param isActive - 에디터가 현재 활성 상태인지 여부
 *
 * @description
 * 이 함수는 DOM 선택이 변경될 때마다 호출되며, Lexical 에디터의 내부 선택 상태를
 * DOM 선택과 동기화합니다. 주요 기능은 다음과 같습니다:
 * 1. 불필요한 선택 변경 처리 건너뛰기
 * 2. 에디터 상태 업데이트
 * 3. 선택 범위의 포맷 및 스타일 결정
 * 4. 선택 변경 명령 디스패치
 */
function onSelectionChange(
  domSelection: Selection,
  editor: LexicalEditor,
  isActive: boolean,
): void {
  const {
    anchorNode: anchorDOM,
    anchorOffset,
    focusNode: focusDOM,
    focusOffset,
  } = domSelection
  if (isSelectionChangeFromDOMUpdate) {
    isSelectionChangeFromDOMUpdate = false

    // 네이티브 DOM 선택이 DOM 요소에 있는 경우, Lexical의 선택이 더 나은 자식으로 정규화되었을 수 있으므로
    // 일반적으로 계속 진행해야 합니다. DOM 요소가 텍스트 노드인 경우, 이 최적화를 안전하게 적용하고
    // 선택 변경을 완전히 건너뛸 수 있습니다.
    // 또한 오프셋이 경계에 있는지 확인해야 합니다.
    // 이 경우에는 형제 노드로 정규화해야 할 수 있기 때문입니다.
    if (
      shouldSkipSelectionChange(anchorDOM, anchorOffset) &&
      shouldSkipSelectionChange(focusDOM, focusOffset)
    ) {
      return
    }
  }
  updateEditor(editor, () => {
    // 활성화되지 않은 에디터는 선택에 대한 추가 논리가 필요하지 않습니다.
    // 선택을 조정하기 위해 업데이트(선택을 null로 설정)만 필요하며, 이를 통해 오직 하나의 에디터만 비null 선택을 갖도록 합니다.
    if (!isActive) {
      $setSelection(null)
      return
    }

    if (!isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return
    }

    const selection = $getSelection()

    // Update the selection format
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor
      const anchorNode = anchor.getNode()

      if (selection.isCollapsed()) {
        // Badly interpreted range selection when collapsed - #1482
        if (
          domSelection.type === 'Range' &&
          domSelection.anchorNode === domSelection.focusNode
        ) {
          selection.dirty = true
        }

        // 축소된 선택 영역 형식을 표시했고, 주어진 시간 범위 내에 있는 경우 –
        // 앵커 노드에서 형식을 가져오는 대신 해당 형식을 사용하려고 시도합니다.
        const windowEvent = getWindow(editor).event
        const currentTimeStamp = windowEvent
          ? windowEvent.timeStamp
          : performance.now()
        const [lastFormat, lastStyle, lastOffset, lastKey, timeStamp] =
          collapsedSelectionFormat

        const root = $getRoot()
        const isRootTextContentEmpty =
          editor.isComposing() === false && root.getTextContent() === ''

        if (
          currentTimeStamp < timeStamp + 200 &&
          anchor.offset === lastOffset &&
          anchor.key === lastKey
        ) {
          selection.format = lastFormat
          selection.style = lastStyle
        } else {
          if (anchor.type === 'text') {
            invariant(
              $isTextNode(anchorNode),
              'Point.getNode() must return TextNode when type is text',
            )
            selection.format = anchorNode.getFormat()
            selection.style = anchorNode.getStyle()
          } else if (anchor.type === 'element' && !isRootTextContentEmpty) {
            const lastNode = anchor.getNode()
            selection.style = ''
            if (
              lastNode instanceof ParagraphNode &&
              lastNode.getChildrenSize() === 0
            ) {
              selection.format = lastNode.getTextFormat()
              selection.style = lastNode.getTextStyle()
            } else {
              selection.format = 0
            }
          }
        }
      } else {
        const anchorKey = anchor.key
        const focus = selection.focus
        const focusKey = focus.key
        const nodes = selection.getNodes()
        const nodesLength = nodes.length
        const isBackward = selection.isBackward()
        const startOffset = isBackward ? focusOffset : anchorOffset
        const endOffset = isBackward ? anchorOffset : focusOffset
        const startKey = isBackward ? focusKey : anchorKey
        const endKey = isBackward ? anchorKey : focusKey
        let combinedFormat = IS_ALL_FORMATTING
        let hasTextNodes = false
        for (let i = 0; i < nodesLength; i++) {
          const node = nodes[i]
          const textContentSize = node.getTextContentSize()
          if (
            $isTextNode(node) &&
            textContentSize !== 0 &&
            // Exclude empty text nodes at boundaries resulting from user's selection
            !(
              (i === 0 &&
                node.__key === startKey &&
                startOffset === textContentSize) ||
              (i === nodesLength - 1 &&
                node.__key === endKey &&
                endOffset === 0)
            )
          ) {
            // TODO: what about style?
            hasTextNodes = true
            combinedFormat &= node.getFormat()
            if (combinedFormat === 0) {
              break
            }
          }
        }

        selection.format = hasTextNodes ? combinedFormat : 0
      }
    }

    dispatchCommand(editor, SELECTION_CHANGE_COMMAND, undefined)
  })
}
/**
 * Lexical 에디터의 클릭 이벤트 핸들러 함수입니다.
 * 주로 Chrome에서 발생하는 빈 블록 선택 관련 버그를 해결하고,
 * 터치 디바이스에서의 선택 처리를 개선합니다.
 *
 * @param event - 포인터 이벤트 객체
 * @param editor - Lexical 에디터 인스턴스
 *
 * @description
 * 이 함수는 다음과 같은 주요 작업을 수행합니다:
 * 1. 빈 블록 선택 시 발생하는 시각적 버그 해결
 * 2. 트리플 클릭으로 인한 오버플로우 선택 처리
 * 3. 터치 디바이스에서의 텍스트 선택 개선
 */
function onClick(event: PointerEvent, editor: LexicalEditor): void {
  updateEditor(editor, () => {
    const selection = $getSelection()
    const domSelection = getDOMSelection(editor._window)
    const lastSelection = $getPreviousSelection()

    if (domSelection) {
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor
        const anchorNode = anchor.getNode()

        if (
          anchor.type === 'element' &&
          anchor.offset === 0 &&
          selection.isCollapsed() &&
          !$isRootNode(anchorNode) &&
          $getRoot().getChildrenSize() === 1 &&
          anchorNode.getTopLevelElementOrThrow().isEmpty() &&
          lastSelection !== null &&
          selection.is(lastSelection)
        ) {
          domSelection.removeAllRanges()
          selection.dirty = true
        } else if (event.detail === 3 && !selection.isCollapsed()) {
          // Tripple click causing selection to overflow into the nearest element. In that
          // case visually it looks like a single element content is selected, focus node
          // is actually at the beginning of the next element (if present) and any manipulations
          // with selection (formatting) are affecting second element as well
          const focus = selection.focus
          const focusNode = focus.getNode()
          if (anchorNode !== focusNode) {
            if ($isElementNode(anchorNode)) {
              anchorNode.select(0)
            } else {
              anchorNode.getParentOrThrow().select(0)
            }
          }
        }
      } else if (event.pointerType === 'touch') {
        // This is used to update the selection on touch devices when the user clicks on text after a
        // node selection. See isSelectionChangeFromMouseDown for the inverse
        const domAnchorNode = domSelection.anchorNode
        if (domAnchorNode !== null) {
          const nodeType = domAnchorNode.nodeType
          // If the user is attempting to click selection back onto text, then
          // we should attempt create a range selection.
          // When we click on an empty paragraph node or the end of a paragraph that ends
          // with an image/poll, the nodeType will be ELEMENT_NODE
          if (nodeType === DOM_ELEMENT_TYPE || nodeType === DOM_TEXT_TYPE) {
            const newSelection = $internalCreateRangeSelection(
              lastSelection,
              domSelection,
              editor,
              event,
            )
            $setSelection(newSelection)
          }
        }
      }
    }

    dispatchCommand(editor, CLICK_COMMAND, event)
  })
}
/**
 * Lexical 에디터의 포인터 다운(마우스 클릭 또는 터치 시작) 이벤트 핸들러 함수입니다.
 *
 * @param event - 포인터 이벤트 객체
 * @param editor - Lexical 에디터 인스턴스
 *
 * @description
 * 이 함수는 포인터 다운 이벤트를 처리하며, 주로 드래그 앤 드롭 동작의 시작을 관리합니다.
 * 현재는 터치 이벤트를 제외한 포인터 이벤트에 대해서만 동작합니다.
 */
function onPointerDown(event: PointerEvent, editor: LexicalEditor) {
  // TODO implement text drag & drop
  const target = event.target
  const pointerType = event.pointerType
  if (target instanceof Node && pointerType !== 'touch') {
    updateEditor(editor, () => {
      // Drag & drop should not recompute selection until mouse up; otherwise the initially
      // selected content is lost.
      if (!$isSelectionCapturedInDecorator(target)) {
        isSelectionChangeFromMouseDown = true
      }
    })
  }
}
/**
 * InputEvent에서 대상 범위를 가져오는 함수입니다.
 *
 * @param event - 입력 이벤트 객체
 * @returns 대상 범위(StaticRange) 또는 null
 *
 * @description
 * 이 함수는 InputEvent에서 제공하는 대상 범위를 반환합니다.
 * getTargetRanges 메서드가 없거나 범위가 없는 경우 null을 반환합니다.
 */
function getTargetRange(event: InputEvent): null | StaticRange {
  if (!event.getTargetRanges) {
    return null
  }
  const targetRanges = event.getTargetRanges()
  if (targetRanges.length === 0) {
    return null
  }
  return targetRanges[0]
}
/**
 * 주어진 노드들 사이의 텍스트를 제거할 수 있는지 확인하는 함수입니다.
 *
 * @param anchorNode - 선택의 시작 노드
 * @param focusNode - 선택의 끝 노드
 * @returns 텍스트 제거가 가능하면 true, 그렇지 않으면 false
 *
 * @description
 * 이 함수는 다음 조건 중 하나라도 만족하면 true를 반환합니다:
 * 1. 시작 노드와 끝 노드가 다른 경우
 * 2. 시작 노드나 끝 노드가 ElementNode인 경우
 * 3. 시작 노드나 끝 노드가 토큰이 아닌 경우
 */
function $canRemoveText(
  anchorNode: TextNode | ElementNode,
  focusNode: TextNode | ElementNode,
): boolean {
  return (
    anchorNode !== focusNode ||
    $isElementNode(anchorNode) ||
    $isElementNode(focusNode) ||
    !anchorNode.isToken() ||
    !focusNode.isToken()
  )
}
/**
 * 안드로이드 디바이스에서 가능한 키 누름 이벤트인지 확인하는 함수입니다.
 *
 * @param timeStamp - 이벤트의 타임스탬프
 * @returns 안드로이드 키 누름일 가능성이 있으면 true, 그렇지 않으면 false
 *
 * @description
 * 이 함수는 안드로이드 디바이스에서 발생할 수 있는 특정 키 누름 패턴을 식별합니다.
 * 마지막 키 코드가 'MediaLast'이고, 타임스탬프가 마지막 keydown 이벤트 이후
 * 특정 지연 시간(ANDROID_COMPOSITION_LATENCY) 내에 있는 경우 true를 반환합니다.
 */
function isPossiblyAndroidKeyPress(timeStamp: number): boolean {
  return (
    lastKeyCode === 'MediaLast' &&
    timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY
  )
}
/**
 * Lexical 에디터의 beforeinput 이벤트 핸들러 함수입니다.
 *
 * @param event - InputEvent 객체
 * @param editor - Lexical 에디터 인스턴스
 *
 * @description
 * 이 함수는 다양한 입력 타입을 처리하고, 에디터의 상태를 적절히 업데이트합니다.
 * 특히 브라우저 간 차이와 특수한 입력 시나리오(예: 안드로이드 입력)를 고려합니다.
 */
function onBeforeInput(event: InputEvent, editor: LexicalEditor): void {
  const inputType = event.inputType
  const targetRange = getTargetRange(event)

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    // If we're pasting in FF, we shouldn't get this event
    // as the `paste` event should have triggered, unless the
    // user has dom.event.clipboardevents.enabled disabled in
    // about:config. In that case, we need to process the
    // pasted content in the DOM mutation phase.
    (IS_FIREFOX && isFirefoxClipboardEvents(editor))
  ) {
    return
  } else if (inputType === 'insertCompositionText') {
    return
  }

  updateEditor(editor, () => {
    const selection = $getSelection()

    if (inputType === 'deleteContentBackward') {
      if (selection === null) {
        // Use previous selection
        const prevSelection = $getPreviousSelection()

        if (!$isRangeSelection(prevSelection)) {
          return
        }

        $setSelection(prevSelection.clone())
      }

      if ($isRangeSelection(selection)) {
        const isSelectionAnchorSameAsFocus =
          selection.anchor.key === selection.focus.key

        if (
          isPossiblyAndroidKeyPress(event.timeStamp) &&
          editor.isComposing() &&
          isSelectionAnchorSameAsFocus
        ) {
          $setCompositionKey(null)
          lastKeyDownTimeStamp = 0
          // Fixes an Android bug where selection flickers when backspacing
          setTimeout(() => {
            updateEditor(editor, () => {
              $setCompositionKey(null)
            })
          }, ANDROID_COMPOSITION_LATENCY)
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode()
            anchorNode.markDirty()
            selection.format = anchorNode.getFormat()
            invariant($isTextNode(anchorNode), 'Anchor node must be a TextNode')
            selection.style = anchorNode.getStyle()
          }
        } else {
          $setCompositionKey(null)
          event.preventDefault()
          // Chromium Android at the moment seems to ignore the preventDefault
          // on 'deleteContentBackward' and still deletes the content. Which leads
          // to multiple deletions. So we let the browser handle the deletion in this case.
          const selectedNodeText = selection.anchor.getNode().getTextContent()
          const hasSelectedAllTextInNode =
            selection.anchor.offset === 0 &&
            selection.focus.offset === selectedNodeText.length
          const shouldLetBrowserHandleDelete =
            IS_ANDROID_CHROME &&
            isSelectionAnchorSameAsFocus &&
            !hasSelectedAllTextInNode
          if (!shouldLetBrowserHandleDelete) {
            dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true)
          }
        }
        return
      }
    }

    if (!$isRangeSelection(selection)) {
      return
    }

    const data = event.data

    // This represents the case when two beforeinput events are triggered at the same time (without a
    // full event loop ending at input). This happens with MacOS with the default keyboard settings,
    // a combination of autocorrection + autocapitalization.
    // Having Lexical run everything in controlled mode would fix the issue without additional code
    // but this would kill the massive performance win from the most common typing event.
    // Alternatively, when this happens we can prematurely update our EditorState based on the DOM
    // content, a job that would usually be the input event's responsibility.
    if (unprocessedBeforeInputData !== null) {
      $updateSelectedTextFromDOM(false, editor, unprocessedBeforeInputData)
    }

    if (
      (!selection.dirty || unprocessedBeforeInputData !== null) &&
      selection.isCollapsed() &&
      !$isRootNode(selection.anchor.getNode()) &&
      targetRange !== null
    ) {
      selection.applyDOMRange(targetRange)
    }

    unprocessedBeforeInputData = null

    const anchor = selection.anchor
    const focus = selection.focus
    const anchorNode = anchor.getNode()
    const focusNode = focus.getNode()

    if (inputType === 'insertText' || inputType === 'insertTranspose') {
      if (data === '\n') {
        event.preventDefault()
        dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false)
      } else if (data === DOUBLE_LINE_BREAK) {
        event.preventDefault()
        dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND, undefined)
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain')
        event.preventDefault()
        selection.insertRawText(text)
      } else if (
        data != null &&
        $shouldPreventDefaultAndInsertText(
          selection,
          targetRange,
          data,
          event.timeStamp,
          true,
        )
      ) {
        event.preventDefault()
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data)
      } else {
        unprocessedBeforeInputData = data
      }
      lastBeforeInputInsertTextTimeStamp = event.timeStamp
      return
    }

    // Prevent the browser from carrying out
    // the input event, so we can control the
    // output.
    event.preventDefault()

    switch (inputType) {
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText': {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event)
        break
      }

      case 'insertFromComposition': {
        // This is the end of composition
        $setCompositionKey(null)
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event)
        break
      }

      case 'insertLineBreak': {
        // Used for Android
        $setCompositionKey(null)
        dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false)
        break
      }

      case 'insertParagraph': {
        // Used for Android
        $setCompositionKey(null)

        // Safari does not provide the type "insertLineBreak".
        // So instead, we need to infer it from the keyboard event.
        // We do not apply this logic to iOS to allow newline auto-capitalization
        // work without creating linebreaks when pressing Enter
        if (isInsertLineBreak && !IS_IOS) {
          isInsertLineBreak = false
          dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false)
        } else {
          dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND, undefined)
        }

        break
      }

      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation': {
        dispatchCommand(editor, PASTE_COMMAND, event)
        break
      }

      case 'deleteByComposition': {
        if ($canRemoveText(anchorNode, focusNode)) {
          dispatchCommand(editor, REMOVE_TEXT_COMMAND, event)
        }

        break
      }

      case 'deleteByDrag':
      case 'deleteByCut': {
        dispatchCommand(editor, REMOVE_TEXT_COMMAND, event)
        break
      }

      case 'deleteContent': {
        dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false)
        break
      }

      case 'deleteWordBackward': {
        dispatchCommand(editor, DELETE_WORD_COMMAND, true)
        break
      }

      case 'deleteWordForward': {
        dispatchCommand(editor, DELETE_WORD_COMMAND, false)
        break
      }

      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward': {
        dispatchCommand(editor, DELETE_LINE_COMMAND, true)
        break
      }

      case 'deleteContentForward':
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        dispatchCommand(editor, DELETE_LINE_COMMAND, false)
        break
      }

      case 'formatStrikeThrough': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'strikethrough')
        break
      }

      case 'formatBold': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold')
        break
      }

      case 'formatItalic': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic')
        break
      }

      case 'formatUnderline': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline')
        break
      }

      case 'historyUndo': {
        dispatchCommand(editor, UNDO_COMMAND, undefined)
        break
      }

      case 'historyRedo': {
        dispatchCommand(editor, REDO_COMMAND, undefined)
        break
      }

      default:
      // NO-OP
    }
  })
}
/**
 * Lexical 에디터의 input 이벤트 핸들러 함수입니다.
 *
 * @param event - InputEvent 객체
 * @param editor - Lexical 에디터 인스턴스
 *
 * @description
 * 이 함수는 사용자 입력을 처리하고 에디터의 상태를 업데이트합니다.
 * 특히 텍스트 삽입, 컴포지션 종료, 선택 영역 조정 등을 다룹니다.
 */
function onInput(event: InputEvent, editor: LexicalEditor): void {
  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation()
  updateEditor(editor, () => {
    const selection = $getSelection()
    const data = event.data
    const targetRange = getTargetRange(event)

    if (
      data != null &&
      $isRangeSelection(selection) &&
      $shouldPreventDefaultAndInsertText(
        selection,
        targetRange,
        data,
        event.timeStamp,
        false,
      )
    ) {
      // Given we're over-riding the default behavior, we will need
      // to ensure to disable composition before dispatching the
      // insertText command for when changing the sequence for FF.
      if (isFirefoxEndingComposition) {
        $onCompositionEndImpl(editor, data)
        isFirefoxEndingComposition = false
      }
      const anchor = selection.anchor
      const anchorNode = anchor.getNode()
      const domSelection = getDOMSelection(editor._window)
      if (domSelection === null) {
        return
      }
      const isBackward = selection.isBackward()
      const startOffset = isBackward
        ? selection.anchor.offset
        : selection.focus.offset
      const endOffset = isBackward
        ? selection.focus.offset
        : selection.anchor.offset
      // If the content is the same as inserted, then don't dispatch an insertion.
      // Given onInput doesn't take the current selection (it uses the previous)
      // we can compare that against what the DOM currently says.
      if (
        !CAN_USE_BEFORE_INPUT ||
        selection.isCollapsed() ||
        !$isTextNode(anchorNode) ||
        domSelection.anchorNode === null ||
        anchorNode.getTextContent().slice(0, startOffset) +
          data +
          anchorNode.getTextContent().slice(startOffset + endOffset) !==
          getAnchorTextFromDOM(domSelection.anchorNode)
      ) {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data)
      }

      const textLength = data.length

      // Another hack for FF, as it's possible that the IME is still
      // open, even though compositionend has already fired (sigh).
      if (
        IS_FIREFOX &&
        textLength > 1 &&
        event.inputType === 'insertCompositionText' &&
        !editor.isComposing()
      ) {
        selection.anchor.offset -= textLength
      }

      // This ensures consistency on Android.
      if (!IS_SAFARI && !IS_IOS && !IS_APPLE_WEBKIT && editor.isComposing()) {
        lastKeyDownTimeStamp = 0
        $setCompositionKey(null)
      }
    } else {
      const characterData = data !== null ? data : undefined
      $updateSelectedTextFromDOM(false, editor, characterData)

      // onInput always fires after onCompositionEnd for FF.
      if (isFirefoxEndingComposition) {
        $onCompositionEndImpl(editor, data || undefined)
        isFirefoxEndingComposition = false
      }
    }

    // Also flush any other mutations that might have occurred
    // since the change.
    $flushMutations()
  })
  unprocessedBeforeInputData = null
}
/**
 * Lexical 에디터의 컴포지션 시작 이벤트 핸들러 함수입니다.
 *
 * @param event - CompositionEvent 객체
 * @param editor - Lexical 에디터 인스턴스
 *
 * @description
 * 이 함수는 IME 컴포지션의 시작을 처리하며, 필요한 경우 특수 문자를 삽입하여
 * 컴포지션을 위한 준비를 합니다. 특히 다양한 브라우저와 입력 시나리오를 고려합니다.
 */
function onCompositionStart(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  updateEditor(editor, () => {
    const selection = $getSelection()

    if ($isRangeSelection(selection) && !editor.isComposing()) {
      const anchor = selection.anchor
      const node = selection.anchor.getNode()
      $setCompositionKey(anchor.key)

      if (
        // If it has been 30ms since the last keydown, then we should
        // apply the empty space heuristic. We can't do this for Safari,
        // as the keydown fires after composition start.
        event.timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY ||
        // FF has issues around composing multibyte characters, so we also
        // need to invoke the empty space heuristic below.
        anchor.type === 'element' ||
        !selection.isCollapsed() ||
        node.getFormat() !== selection.format ||
        ($isTextNode(node) && node.getStyle() !== selection.style)
      ) {
        // We insert a zero width character, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        dispatchCommand(
          editor,
          CONTROLLED_TEXT_INSERTION_COMMAND,
          COMPOSITION_START_CHAR,
        )
      }
    }
  })
}
/**
 * Lexical 에디터의 컴포지션 종료를 처리하는 내부 함수입니다.
 *
 * @param editor - Lexical 에디터 인스턴스
 * @param data - 컴포지션 결과 데이터 (선택적)
 *
 * @description
 * 이 함수는 IME 컴포지션의 종료를 처리하며, 다양한 시나리오(빈 데이터, 줄바꿈 등)를 고려합니다.
 * 컴포지션 결과에 따라 에디터의 상태를 적절히 업데이트합니다.
 */
function $onCompositionEndImpl(editor: LexicalEditor, data?: string): void {
  const compositionKey = editor._compositionKey
  $setCompositionKey(null)

  // Handle termination of composition.
  if (compositionKey !== null && data != null) {
    // Composition can sometimes move to an adjacent DOM node when backspacing.
    // So check for the empty case.
    if (data === '') {
      const node = $getNodeByKey(compositionKey)
      const textNode = getDOMTextNode(editor.getElementByKey(compositionKey))

      if (
        textNode !== null &&
        textNode.nodeValue !== null &&
        $isTextNode(node)
      ) {
        $updateTextNodeFromDOMContent(
          node,
          textNode.nodeValue,
          null,
          null,
          true,
        )
      }

      return
    }

    // Composition can sometimes be that of a new line. In which case, we need to
    // handle that accordingly.
    if (data[data.length - 1] === '\n') {
      const selection = $getSelection()

      if ($isRangeSelection(selection)) {
        // If the last character is a line break, we also need to insert
        // a line break.
        const focus = selection.focus
        selection.anchor.set(focus.key, focus.offset, focus.type)
        dispatchCommand(editor, KEY_ENTER_COMMAND, null)
        return
      }
    }
  }

  $updateSelectedTextFromDOM(true, editor, data)
}
/**
 * CompositionEnd 이벤트 핸들러입니다.
 *
 * @param event - CompositionEnd 이벤트 객체입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 */
function onCompositionEnd(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  // Firefox는 onCompositionEnd를 onInput보다 먼저 발생시키지만,
  // Chrome/Webkit은 onInput을 onCompositionEnd보다 먼저 발생시킵니다.
  // 시퀀스가 Chrome/Webkit처럼 동작하도록 보장하기 위해,
  // Firefox에서 onCompositionEnd의 처리를 onInput의 로직을 처리할 때까지 연기하기 위해
  // isFirefoxEndingComposition 플래그를 사용합니다.
  if (IS_FIREFOX) {
    isFirefoxEndingComposition = true
  } else {
    updateEditor(editor, () => {
      $onCompositionEndImpl(editor, event.data)
    })
  }
}
/**
 * 키보드 이벤트 핸들러입니다.
 *
 * @param event - 키보드 이벤트 객체입니다.
 * @param editor - LexicalEditor 인스턴스입니다.
 */
function onKeyDown(event: KeyboardEvent, editor: LexicalEditor): void {
  lastKeyDownTimeStamp = event.timeStamp
  lastKeyCode = event.key
  if (editor.isComposing()) {
    return
  }

  const { key, shiftKey, ctrlKey, metaKey, altKey } = event

  if (dispatchCommand(editor, KEY_DOWN_COMMAND, event)) {
    return
  }

  if (key == null) {
    return
  }

  if (isMoveForward(key, ctrlKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, event)
  } else if (isMoveToEnd(key, ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, MOVE_TO_END, event)
  } else if (isMoveBackward(key, ctrlKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, event)
  } else if (isMoveToStart(key, ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, MOVE_TO_START, event)
  } else if (isMoveUp(key, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_UP_COMMAND, event)
  } else if (isMoveDown(key, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_DOWN_COMMAND, event)
  } else if (isLineBreak(key, shiftKey)) {
    isInsertLineBreak = true
    dispatchCommand(editor, KEY_ENTER_COMMAND, event)
  } else if (isSpace(key)) {
    dispatchCommand(editor, KEY_SPACE_COMMAND, event)
  } else if (isOpenLineBreak(key, ctrlKey)) {
    event.preventDefault()
    isInsertLineBreak = true
    dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, true)
  } else if (isParagraph(key, shiftKey)) {
    isInsertLineBreak = false
    dispatchCommand(editor, KEY_ENTER_COMMAND, event)
  } else if (isDeleteBackward(key, altKey, metaKey, ctrlKey)) {
    if (isBackspace(key)) {
      dispatchCommand(editor, KEY_BACKSPACE_COMMAND, event)
    } else {
      event.preventDefault()
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true)
    }
  } else if (isEscape(key)) {
    dispatchCommand(editor, KEY_ESCAPE_COMMAND, event)
  } else if (isDeleteForward(key, ctrlKey, shiftKey, altKey, metaKey)) {
    if (isDelete(key)) {
      dispatchCommand(editor, KEY_DELETE_COMMAND, event)
    } else {
      event.preventDefault()
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false)
    }
  } else if (isDeleteWordBackward(key, altKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, DELETE_WORD_COMMAND, true)
  } else if (isDeleteWordForward(key, altKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, DELETE_WORD_COMMAND, false)
  } else if (isDeleteLineBackward(key, metaKey)) {
    event.preventDefault()
    dispatchCommand(editor, DELETE_LINE_COMMAND, true)
  } else if (isDeleteLineForward(key, metaKey)) {
    event.preventDefault()
    dispatchCommand(editor, DELETE_LINE_COMMAND, false)
  } else if (isBold(key, altKey, metaKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold')
  } else if (isUnderline(key, altKey, metaKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline')
  } else if (isItalic(key, altKey, metaKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic')
  } else if (isTab(key, altKey, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_TAB_COMMAND, event)
  } else if (isUndo(key, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, UNDO_COMMAND, undefined)
  } else if (isRedo(key, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault()
    dispatchCommand(editor, REDO_COMMAND, undefined)
  } else {
    const prevSelection = editor._editorState._selection
    if ($isNodeSelection(prevSelection)) {
      if (isCopy(key, shiftKey, metaKey, ctrlKey)) {
        event.preventDefault()
        dispatchCommand(editor, COPY_COMMAND, event)
      } else if (isCut(key, shiftKey, metaKey, ctrlKey)) {
        event.preventDefault()
        dispatchCommand(editor, CUT_COMMAND, event)
      } else if (isSelectAll(key, metaKey, ctrlKey)) {
        event.preventDefault()
        dispatchCommand(editor, SELECT_ALL_COMMAND, event)
      }
      // FF does it well (no need to override behavior)
    } else if (!IS_FIREFOX && isSelectAll(key, metaKey, ctrlKey)) {
      event.preventDefault()
      dispatchCommand(editor, SELECT_ALL_COMMAND, event)
    }
  }

  if (isModifier(ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_MODIFIER_COMMAND, event)
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

  // When editor receives selection change event, we're checking if
  // it has any sibling editors (within same parent editor) that were active
  // before, and trigger selection change on it to nullify selection.
  const editors = getEditorsToPropagate(nextActiveEditor)
  const rootEditor = editors[editors.length - 1]
  const rootEditorKey = rootEditor._key
  const activeNestedEditor = activeNestedEditorsMap.get(rootEditorKey)
  const prevActiveEditor = activeNestedEditor || rootEditor

  if (prevActiveEditor !== nextActiveEditor) {
    onSelectionChange(domSelection, prevActiveEditor, false)
  }

  onSelectionChange(domSelection, nextActiveEditor, true)

  // If newly selected editor is nested, then add it to the map, clean map otherwise
  if (nextActiveEditor !== rootEditor) {
    activeNestedEditorsMap.set(rootEditorKey, nextActiveEditor)
  } else if (activeNestedEditor) {
    activeNestedEditorsMap.delete(rootEditorKey)
  }
}

/**
 * Lexical 이벤트의 전파를 중지합니다.
 *
 * @param event - Lexical 이벤트 객체입니다.
 */
function stopLexicalPropagation(event: Event): void {
  // 동일한 이벤트가 부모 에디터에서 다시 발생하지 않도록
  // 특수한 속성을 추가합니다.
  // @ts-ignore
  event._lexicalHandled = true
}
function hasStoppedLexicalPropagation(event: Event): boolean {
  // @ts-ignore
  const stopped = event._lexicalHandled === true
  return stopped
}

export type EventHandler = (event: Event, editor: LexicalEditor) => void
export function addRootElementEvents(
  rootElement: HTMLElement,
  editor: LexicalEditor,
): void {
  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  const doc = rootElement.ownerDocument
  const documentRootElementsCount = rootElementsRegistered.get(doc)
  if (
    documentRootElementsCount === undefined ||
    documentRootElementsCount < 1
  ) {
    doc.addEventListener('selectionchange', onDocumentSelectionChange)
  }
  rootElementsRegistered.set(doc, (documentRootElementsCount || 0) + 1)

  // @ts-expect-error: internal field
  rootElement.__lexicalEditor = editor
  const removeHandles = getRootElementRemoveHandles(rootElement)

  for (let i = 0; i < rootElementEvents.length; i++) {
    const [eventName, onEvent] = rootElementEvents[i]
    const eventHandler =
      typeof onEvent === 'function'
        ? (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return
            }
            stopLexicalPropagation(event)
            if (editor.isEditable() || eventName === 'click') {
              onEvent(event, editor)
            }
          }
        : (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return
            }
            stopLexicalPropagation(event)
            const isEditable = editor.isEditable()
            switch (eventName) {
              case 'cut':
                return (
                  isEditable &&
                  dispatchCommand(editor, CUT_COMMAND, event as ClipboardEvent)
                )

              case 'copy':
                return dispatchCommand(
                  editor,
                  COPY_COMMAND,
                  event as ClipboardEvent,
                )

              case 'paste':
                return (
                  isEditable &&
                  dispatchCommand(
                    editor,
                    PASTE_COMMAND,
                    event as ClipboardEvent,
                  )
                )

              case 'dragstart':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGSTART_COMMAND, event as DragEvent)
                )

              case 'dragover':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGOVER_COMMAND, event as DragEvent)
                )

              case 'dragend':
                return (
                  isEditable &&
                  dispatchCommand(editor, DRAGEND_COMMAND, event as DragEvent)
                )

              case 'focus':
                return (
                  isEditable &&
                  dispatchCommand(editor, FOCUS_COMMAND, event as FocusEvent)
                )

              case 'blur': {
                return (
                  isEditable &&
                  dispatchCommand(editor, BLUR_COMMAND, event as FocusEvent)
                )
              }

              case 'drop':
                return (
                  isEditable &&
                  dispatchCommand(editor, DROP_COMMAND, event as DragEvent)
                )
            }
          }
    rootElement.addEventListener(eventName, eventHandler)
    removeHandles.push(() => {
      rootElement.removeEventListener(eventName, eventHandler)
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
/**
 * 활성 중첩 에디터 맵을 정리합니다.
 *
 * @param editor - 정리할 LexicalEditor 인스턴스입니다.
 */
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
/**
 * DOM 업데이트로 인한 선택 변경을 표시합니다.
 */
export function markSelectionChangeFromDOMUpdate(): void {
  isSelectionChangeFromDOMUpdate = true
}
/**
 * 축소된 선택 영역 형식을 표시합니다.
 *
 * @param format - 선택 영역의 형식을 나타내는 숫자입니다.
 * @param style - 선택 영역의 스타일을 나타내는 문자열입니다.
 * @param offset - 선택 영역의 오프셋을 나타내는 숫자입니다.
 * @param key - 선택 영역의 키를 나타내는 NodeKey입니다.
 * @param timeStamp - 선택 영역이 표시된 타임스탬프를 나타내는 숫자입니다.
 */
export function markCollapsedSelectionFormat(
  format: number,
  style: string,
  offset: number,
  key: NodeKey,
  timeStamp: number,
): void {
  collapsedSelectionFormat = [format, style, offset, key, timeStamp]
}

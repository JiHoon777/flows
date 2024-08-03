import type { EditorState } from '@/lib/lexical/lexical-editor-state.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type {
  EditorConfig,
  MutatedNodes,
  MutationListeners,
  RegisteredNodes,
} from '@/lib/lexical/lexical-editor.type.ts'
import type { NodeKey, NodeMap } from '@/lib/lexical/lexical-node.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

import {
  DOUBLE_LINE_BREAK,
  FULL_RECONCILE,
  IS_ALIGN_CENTER,
  IS_ALIGN_END,
  IS_ALIGN_JUSTIFY,
  IS_ALIGN_LEFT,
  IS_ALIGN_RIGHT,
  IS_ALIGN_START,
} from '@/lib/lexical/lexical-constants.ts'
import {
  $textContentRequiresDoubleLinebreakAtEnd,
  cloneDecorators,
  getElementByKeyOrThrow,
  getTextDirection,
  setMutatedNode,
} from '@/lib/lexical/lexical-utils.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import { $isElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { $isLineBreakNode } from '@/lib/lexical/nodes/lexical-line-break-node.ts'
import { $isParagraphNode } from '@/lib/lexical/nodes/lexical-paragraph-node.ts'
import { $isRootNode } from '@/lib/lexical/nodes/lexical-root-node.ts'
import { $isTextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant.ts'
import { normalizeClassNames } from '@/utils/normalize-class-name.ts'

type IntentionallyMarkedAsDirtyElement = boolean

let subTreeTextContent = ''
let subTreeDirectionedTextContent = ''
let subTreeTextFormat: number | null = null
let subTreeTextStyle: string = ''
let editorTextContent = ''
let activeEditorConfig: EditorConfig
let activeEditor: LexicalEditor
let activeEditorNodes: RegisteredNodes
let treatAllNodesAsDirty = false
let activeEditorStateReadOnly = false
let activeMutationListeners: MutationListeners
let activeTextDirection: 'ltr' | 'rtl' | null = null
let activeDirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>
let activeDirtyLeaves: Set<NodeKey>
let activePrevNodeMap: NodeMap
let activeNextNodeMap: NodeMap
let activePrevKeyToDOMMap: Map<NodeKey, HTMLElement>
let mutatedNodes: MutatedNodes

/**
 * 주어진 키에 해당하는 노드를 파괴합니다.
 *
 * @desc 이 함수는 Lexical 노드와 해당하는 DOM 요소를 파괴합니다.
 * 노드가 요소 노드인 경우, 자식 노드들도 재귀적으로 파괴됩니다.
 * 또한, 노드가 에디터 상태에서 제거될 때 대응되는 DOM 노드가 메모리에서 누수되지 않도록 합니다.
 *
 * @param key - 파괴할 노드의 키입니다.
 * @param parentDOM - 파괴할 DOM 요소의 부모입니다. null일 수 있습니다.
 */
function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap.get(key)

  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key)
    if (dom.parentNode === parentDOM) {
      parentDOM.removeChild(dom)
    }
  }

  // 이 로직은 매우 중요합니다. 그렇지 않으면 해당 Lexical 노드가
  // 에디터 상태에서 제거될 때 대응되는 DOM 노드가 메모리 누수로 이어질 수 있습니다.
  if (!activeNextNodeMap.has(key)) {
    activeEditor._keyToDOMMap.delete(key)
  }

  if ($isElementNode(node)) {
    const children = createChildrenArray(node, activePrevNodeMap)
    destroyChildren(children, 0, children.length - 1, null)
  }

  if (node !== undefined) {
    setMutatedNode(
      mutatedNodes,
      activeEditorNodes,
      activeMutationListeners,
      node,
      'destroyed',
    )
  }
}
/**
 * 주어진 자식 노드 키 배열의 노드들을 파괴합니다.
 *
 * @desc 이 함수는 주어진 자식 노드 키 배열의 시작 인덱스부터 끝 인덱스까지의
 * 각 노드를 파괴합니다. 각 노드가 DOM에 연결되어 있는 경우 해당 DOM 요소도
 * 파괴합니다. 노드 키가 정의되어 있는 경우에만 파괴 작업을 수행합니다.
 *
 * @param children - 파괴할 자식 노드 키 배열입니다.
 * @param _startIndex - 파괴를 시작할 인덱스입니다.
 * @param endIndex - 파괴를 종료할 인덱스입니다.
 * @param dom - 파괴할 DOM 요소입니다. null일 수 있습니다.
 */
function destroyChildren(
  children: Array<NodeKey>,
  _startIndex: number,
  endIndex: number,
  dom: null | HTMLElement,
): void {
  let startIndex = _startIndex

  for (; startIndex <= endIndex; ++startIndex) {
    const child = children[startIndex]

    if (child !== undefined) {
      destroyNode(child, dom)
    }
  }
}
function setTextAlign(domStyle: CSSStyleDeclaration, value: string): void {
  domStyle.setProperty('text-align', value)
}

const DEFAULT_INDENT_VALUE = '40px'

/**
 * DOM 요소의 들여쓰기를 설정합니다.
 *
 * @desc 이 함수는 주어진 DOM 요소에 들여쓰기 클래스를 추가하거나 제거하고,
 * 들여쓰기 값을 기반으로 `padding-inline-start` 스타일 속성을 설정합니다.
 * 만약 `indent` 값이 0보다 크면 들여쓰기 클래스를 추가하고,
 * 0보다 작거나 같으면 클래스를 제거합니다.
 *
 * @param dom - 들여쓰기를 설정할 DOM 요소입니다.
 * @param indent - 들여쓰기 수준을 나타내는 숫자입니다.
 */
function setElementIndent(dom: HTMLElement, indent: number): void {
  const indentClassName = activeEditorConfig.theme.indent

  if (typeof indentClassName === 'string') {
    const elementHasClassName = dom.classList.contains(indentClassName)

    if (indent > 0 && !elementHasClassName) {
      dom.classList.add(indentClassName)
    } else if (indent < 1 && elementHasClassName) {
      dom.classList.remove(indentClassName)
    }
  }

  const indentationBaseValue =
    getComputedStyle(dom).getPropertyValue('--lexical-indent-base-value') ||
    DEFAULT_INDENT_VALUE

  dom.style.setProperty(
    'padding-inline-start',
    indent === 0 ? '' : `calc(${indent} * ${indentationBaseValue})`,
  )
}

function setElementFormat(dom: HTMLElement, format: number): void {
  const domStyle = dom.style

  if (format === 0) {
    setTextAlign(domStyle, '')
  } else if (format === IS_ALIGN_LEFT) {
    setTextAlign(domStyle, 'left')
  } else if (format === IS_ALIGN_CENTER) {
    setTextAlign(domStyle, 'center')
  } else if (format === IS_ALIGN_RIGHT) {
    setTextAlign(domStyle, 'right')
  } else if (format === IS_ALIGN_JUSTIFY) {
    setTextAlign(domStyle, 'justify')
  } else if (format === IS_ALIGN_START) {
    setTextAlign(domStyle, 'start')
  } else if (format === IS_ALIGN_END) {
    setTextAlign(domStyle, 'end')
  }
}
/**
 * 주어진 키를 사용하여 노드를 생성하고 DOM에 삽입합니다.
 *
 * @desc 이 함수는 주어진 키에 해당하는 노드를 생성하고, 필요한 속성들을 설정한 후
 * DOM에 삽입합니다. 텍스트 노드와 데코레이터 노드는 특별한 속성을 추가하여 텍스트
 * 병합이나 검사의 문제를 방지합니다. 요소 노드는 들여쓰기와 형식을 설정하고, 자식
 * 노드를 재귀적으로 생성합니다. 생성된 노드는 부모 DOM에 삽입됩니다.
 *
 * @param key - 생성할 노드의 키입니다.
 * @param parentDOM - 생성된 노드를 삽입할 부모 DOM 요소입니다. null일 수 있습니다.
 * @param insertDOM - 삽입할 위치를 나타내는 DOM 노드입니다. null일 수 있습니다.
 * @returns 생성된 DOM 요소입니다.
 * @throws 주어진 키에 해당하는 노드가 존재하지 않으면 오류를 발생시킵니다.
 */
function $createNode(
  key: NodeKey,
  parentDOM: null | HTMLElement,
  insertDOM: null | Node,
): HTMLElement {
  const node = activeNextNodeMap.get(key)

  if (node === undefined) {
    invariant(false, 'createNode: node does not exist in nodeMap')
  }
  const dom = node.createDOM(activeEditorConfig, activeEditor)
  storeDOMWithKey(key, dom, activeEditor)

  // 텍스트를 보존하고, 스펠 체크 도구가 스팬을 병합하거나 깨뜨리지 않도록 돕습니다.
  if ($isTextNode(node)) {
    dom.setAttribute('data-lexical-text', 'true')
  } else if ($isDecoratorNode(node)) {
    dom.setAttribute('data-lexical-decorator', 'true')
  }

  if ($isElementNode(node)) {
    const indent = node.__indent
    const childrenSize = node.__size

    if (indent !== 0) {
      setElementIndent(dom, indent)
    }
    if (childrenSize !== 0) {
      const endIndex = childrenSize - 1
      const children = createChildrenArray(node, activeNextNodeMap)
      $createChildrenWithDirection(children, endIndex, node, dom)
    }
    const format = node.__format

    if (format !== 0) {
      setElementFormat(dom, format)
    }
    if (!node.isInline()) {
      reconcileElementTerminatingLineBreak(null, node, dom)
    }
    if ($textContentRequiresDoubleLinebreakAtEnd(node)) {
      subTreeTextContent += DOUBLE_LINE_BREAK
      editorTextContent += DOUBLE_LINE_BREAK
    }
  } else {
    const text = node.getTextContent()

    if ($isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor, activeEditorConfig)

      if (decorator !== null) {
        reconcileDecorator(key, decorator)
      }
      // Decorators are always non editable
      dom.contentEditable = 'false'
    } else if ($isTextNode(node)) {
      if (!node.isDirectionless()) {
        subTreeDirectionedTextContent += text
      }
    }
    subTreeTextContent += text
    editorTextContent += text
  }

  if (parentDOM !== null) {
    if (insertDOM != null) {
      parentDOM.insertBefore(dom, insertDOM)
    } else {
      // @ts-expect-error: internal field
      const possibleLineBreak = parentDOM.__lexicalLineBreak

      if (possibleLineBreak != null) {
        parentDOM.insertBefore(dom, possibleLineBreak)
      } else {
        parentDOM.appendChild(dom)
      }
    }
  }

  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(node)
  }

  setMutatedNode(
    mutatedNodes,
    activeEditorNodes,
    activeMutationListeners,
    node,
    'created',
  )
  return dom
}
/**
 * 주어진 방향으로 자식 노드를 생성합니다.
 *
 * @desc 이 함수는 주어진 자식 노드 배열의 자식 노드들을 생성하고,
 * 필요한 경우 블록 방향을 조정합니다. 자식 노드를 생성하기 전후로
 * `subTreeDirectionedTextContent` 변수를 사용하여 방향이 지정된 텍스트 콘텐츠를 추적합니다.
 *
 * @param children - 생성할 자식 노드의 키 배열입니다.
 * @param endIndex - 자식 노드 배열의 끝 인덱스입니다.
 * @param element - 부모 요소 노드입니다.
 * @param dom - 부모 DOM 요소입니다.
 */
function $createChildrenWithDirection(
  children: Array<NodeKey>,
  endIndex: number,
  element: ElementNode,
  dom: HTMLElement,
): void {
  const previousSubTreeDirectionedTextContent = subTreeDirectionedTextContent
  subTreeDirectionedTextContent = ''
  $createChildren(children, element, 0, endIndex, dom, null)
  reconcileBlockDirection(element, dom)
  subTreeDirectionedTextContent = previousSubTreeDirectionedTextContent
}
/**
 * 주어진 자식 노드 키 배열을 사용하여 자식 노드를 생성합니다.
 *
 * @desc 이 함수는 주어진 자식 노드 키 배열을 사용하여 자식 노드를 생성하고,
 * 필요한 경우 텍스트 콘텐츠와 형식을 설정합니다. 자식 노드를 생성하기 전후로
 * `subTreeTextContent` 변수를 사용하여 텍스트 콘텐츠를 추적합니다.
 *
 * @param children - 생성할 자식 노드의 키 배열입니다.
 * @param element - 부모 요소 노드입니다.
 * @param _startIndex - 자식 노드 배열의 시작 인덱스입니다.
 * @param endIndex - 자식 노드 배열의 끝 인덱스입니다.
 * @param dom - 부모 DOM 요소입니다. null일 수 있습니다.
 * @param insertDOM - 삽입할 위치를 나타내는 DOM 노드입니다. null일 수 있습니다.
 */
function $createChildren(
  children: Array<NodeKey>,
  element: ElementNode,
  _startIndex: number,
  endIndex: number,
  dom: null | HTMLElement,
  insertDOM: null | HTMLElement,
): void {
  const previousSubTreeTextContent = subTreeTextContent
  subTreeTextContent = ''
  let startIndex = _startIndex

  for (; startIndex <= endIndex; ++startIndex) {
    $createNode(children[startIndex], dom, insertDOM)
    const node = activeNextNodeMap.get(children[startIndex])
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat()
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = node.getStyle()
      }
    }
  }
  if ($textContentRequiresDoubleLinebreakAtEnd(element)) {
    subTreeTextContent += DOUBLE_LINE_BREAK
  }
  // @ts-expect-error: internal field
  dom.__lexicalTextContent = subTreeTextContent
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent
}
/**
 * 주어진 키에 해당하는 자식 노드가 마지막 줄 바꿈 노드 또는 데코레이터 노드인지 확인합니다.
 *
 * @desc 이 함수는 주어진 키에 해당하는 자식 노드가 줄 바꿈 노드인지,
 * 아니면 인라인 데코레이터 노드인지를 확인합니다. 이를 통해 노드가
 * 마지막 줄 바꿈 노드 또는 데코레이터 노드인지 여부를 판단합니다.
 *
 * @param childKey - 확인할 자식 노드의 키입니다.
 * @param nodeMap - 노드 키와 노드 객체의 맵입니다.
 * @returns 자식 노드가 마지막 줄 바꿈 노드 또는 인라인 데코레이터 노드이면 true를 반환하고, 그렇지 않으면 false를 반환합니다.
 */
function isLastChildLineBreakOrDecorator(
  childKey: NodeKey,
  nodeMap: NodeMap,
): boolean {
  const node = nodeMap.get(childKey)
  return $isLineBreakNode(node) || ($isDecoratorNode(node) && node.isInline())
}
/**
 * 요소가 LineBreakNode로 끝나는 경우 추가 <br> 요소를 조정합니다.
 *
 * @desc 이 함수는 이전 요소와 다음 요소의 마지막 자식 노드가 LineBreakNode인지 확인하고,
 * 다음 요소가 LineBreakNode로 끝나는 경우 추가 <br> 요소를 DOM에 추가하거나,
 * 그렇지 않은 경우 기존 <br> 요소를 제거합니다.
 *
 * @param prevElement - 이전 요소 노드입니다. null일 수 있습니다.
 * @param nextElement - 다음 요소 노드입니다.
 * @param dom - DOM 요소입니다.
 */
function reconcileElementTerminatingLineBreak(
  prevElement: null | ElementNode,
  nextElement: ElementNode,
  dom: HTMLElement,
): void {
  const prevLineBreak =
    prevElement !== null &&
    (prevElement.__size === 0 ||
      isLastChildLineBreakOrDecorator(
        prevElement.__last as NodeKey,
        activePrevNodeMap,
      ))
  const nextLineBreak =
    nextElement.__size === 0 ||
    isLastChildLineBreakOrDecorator(
      nextElement.__last as NodeKey,
      activeNextNodeMap,
    )

  if (prevLineBreak) {
    if (!nextLineBreak) {
      // @ts-expect-error: internal field
      const element = dom.__lexicalLineBreak

      if (element != null) {
        dom.removeChild(element)
      }

      // @ts-expect-error: internal field
      dom.__lexicalLineBreak = null
    }
  } else if (nextLineBreak) {
    const element = document.createElement('br')
    // @ts-expect-error: internal field
    dom.__lexicalLineBreak = element
    dom.appendChild(element)
  }
}
/**
 * 단락 노드의 형식을 조정합니다.
 *
 * @desc 이 함수는 주어진 요소 노드가 단락 노드인 경우, 현재 서브트리의 텍스트 형식과 스타일을
 * 단락 노드에 설정합니다. 단, 텍스트 형식이 현재 단락 노드의 형식과 다르고,
 * 현재 에디터 상태가 읽기 전용이 아닌 경우에만 설정합니다.
 *
 * @param element - 형식을 조정할 요소 노드입니다.
 */
function reconcileParagraphFormat(element: ElementNode): void {
  if (
    $isParagraphNode(element) &&
    subTreeTextFormat != null &&
    subTreeTextFormat !== element.__textFormat &&
    !activeEditorStateReadOnly
  ) {
    element.setTextFormat(subTreeTextFormat)
    element.setTextStyle(subTreeTextStyle)
  }
}
/**
 * 단락 노드의 스타일을 조정합니다.
 *
 * @desc 이 함수는 주어진 요소 노드가 단락 노드인 경우, 현재 서브트리의 텍스트 스타일을
 * 단락 노드에 설정합니다. 단, 텍스트 스타일이 빈 문자열이 아니고, 현재 단락 노드의 스타일과 다르며,
 * 현재 에디터 상태가 읽기 전용이 아닌 경우에만 설정합니다.
 *
 * @param element - 스타일을 조정할 요소 노드입니다.
 */
function reconcileParagraphStyle(element: ElementNode): void {
  if (
    $isParagraphNode(element) &&
    subTreeTextStyle !== '' &&
    subTreeTextStyle !== element.__textStyle &&
    !activeEditorStateReadOnly
  ) {
    element.setTextStyle(subTreeTextStyle)
  }
}
/**
 * 블록 요소의 방향을 조정합니다.
 *
 * @desc 이 함수는 주어진 요소 노드와 DOM 요소의 텍스트 방향을 조정합니다.
 * 서브트리의 방향이 변경되었거나, 이전 방향과 현재 방향이 다른 경우 새로운
 * 방향을 설정하고, 해당 방향에 맞는 테마 클래스를 적용합니다. 읽기 전용이 아닌 경우
 * 요소 노드의 방향 속성을 업데이트합니다.
 *
 * @param element - 방향을 조정할 요소 노드입니다.
 * @param dom - 방향을 조정할 DOM 요소입니다.
 */
function reconcileBlockDirection(element: ElementNode, dom: HTMLElement): void {
  const previousSubTreeDirectionTextContent: string =
    // @ts-expect-error: internal field
    dom.__lexicalDirTextContent
  // @ts-expect-error: internal field
  const previousDirection: 'ltr' | 'rtl' = dom.__lexicalDir

  if (
    previousSubTreeDirectionTextContent !== subTreeDirectionedTextContent ||
    previousDirection !== activeTextDirection
  ) {
    const hasEmptyDirectionedTextContent = subTreeDirectionedTextContent === ''
    const direction = hasEmptyDirectionedTextContent
      ? activeTextDirection
      : getTextDirection(subTreeDirectionedTextContent)

    if (direction !== previousDirection) {
      const classList = dom.classList
      const theme = activeEditorConfig.theme
      let previousDirectionTheme =
        previousDirection !== null ? theme[previousDirection] : undefined
      let nextDirectionTheme = direction !== null ? theme[direction] : undefined

      // Remove the old theme classes if they exist
      if (previousDirectionTheme !== undefined) {
        if (typeof previousDirectionTheme === 'string') {
          const classNamesArr = normalizeClassNames(previousDirectionTheme)
          // @ts-ignore
          previousDirectionTheme = theme[previousDirection] = classNamesArr
        }

        // @ts-ignore: intentional
        classList.remove(...previousDirectionTheme)
      }

      if (
        direction === null ||
        (hasEmptyDirectionedTextContent && direction === 'ltr')
      ) {
        // Remove direction
        dom.removeAttribute('dir')
      } else {
        // Apply the new theme classes if they exist
        if (nextDirectionTheme !== undefined) {
          if (typeof nextDirectionTheme === 'string') {
            const classNamesArr = normalizeClassNames(nextDirectionTheme)
            // @ts-expect-error: intentional
            nextDirectionTheme = theme[direction] = classNamesArr
          }

          if (nextDirectionTheme !== undefined) {
            classList.add(...nextDirectionTheme)
          }
        }

        // Update direction
        dom.dir = direction
      }

      if (!activeEditorStateReadOnly) {
        const writableNode = element.getWritable()
        writableNode.__dir = direction
      }
    }

    activeTextDirection = direction
    // @ts-expect-error: internal field
    dom.__lexicalDirTextContent = subTreeDirectionedTextContent
    // @ts-expect-error: internal field
    dom.__lexicalDir = direction
  }
}
/**
 * 주어진 요소의 자식 노드들을 방향에 맞게 조정합니다.
 *
 * @desc 이 함수는 주어진 이전 요소와 다음 요소의 자식 노드를 조정하고,
 * 블록 방향, 단락 형식, 단락 스타일을 조정합니다. 이를 위해 서브트리의 텍스트
 * 형식과 스타일을 초기화하고, `subTreeDirectionedTextContent`를 사용하여 방향이 지정된
 * 텍스트 콘텐츠를 추적합니다.
 *
 * @param prevElement - 이전 요소 노드입니다.
 * @param nextElement - 다음 요소 노드입니다.
 * @param dom - DOM 요소입니다.
 */
function $reconcileChildrenWithDirection(
  prevElement: ElementNode,
  nextElement: ElementNode,
  dom: HTMLElement,
): void {
  const previousSubTreeDirectionTextContent = subTreeDirectionedTextContent
  subTreeDirectionedTextContent = ''
  subTreeTextFormat = null
  subTreeTextStyle = ''
  $reconcileChildren(prevElement, nextElement, dom)
  reconcileBlockDirection(nextElement, dom)
  reconcileParagraphFormat(nextElement)
  reconcileParagraphStyle(nextElement)
  subTreeDirectionedTextContent = previousSubTreeDirectionTextContent
}
/**
 * 주어진 요소 노드의 자식 노드 키 배열을 생성합니다.
 *
 * @desc 이 함수는 주어진 요소 노드의 첫 번째 자식 노드부터 시작하여
 * 모든 자식 노드의 키를 배열에 저장하고 반환합니다. 노드 맵에서
 * 자식 노드를 순회하여 각 노드의 키를 배열에 추가합니다.
 * 노드가 노드 맵에 존재하지 않는 경우 오류를 발생시킵니다.
 *
 * @param element - 자식 노드 키 배열을 생성할 요소 노드입니다.
 * @param nodeMap - 노드 키와 노드 객체의 맵입니다.
 * @returns 자식 노드 키 배열입니다.
 * @throws 노드 맵에 존재하지 않는 노드가 있는 경우 오류를 발생시킵니다.
 */
function createChildrenArray(
  element: ElementNode,
  nodeMap: NodeMap,
): Array<NodeKey> {
  const children = []
  let nodeKey = element.__first
  while (nodeKey !== null) {
    const node = nodeMap.get(nodeKey)
    if (node === undefined) {
      invariant(false, 'createChildrenArray: node does not exist in nodeMap')
    }
    children.push(nodeKey)
    nodeKey = node.__next
  }
  return children
}
/**
 * 이전 요소와 다음 요소의 자식 노드를 조정합니다.
 *
 * @desc 이 함수는 이전 요소와 다음 요소의 자식 노드를 비교하고, 필요한 경우
 * 자식 노드를 생성, 업데이트, 또는 제거합니다. 서브트리의 텍스트 콘텐츠를 초기화하고,
 * 자식 노드를 재귀적으로 조정합니다. 또한, 텍스트 노드의 형식과 스타일을 추적합니다.
 *
 * @param prevElement - 이전 요소 노드입니다.
 * @param nextElement - 다음 요소 노드입니다.
 * @param dom - DOM 요소입니다.
 */
function $reconcileChildren(
  prevElement: ElementNode,
  nextElement: ElementNode,
  dom: HTMLElement,
): void {
  const previousSubTreeTextContent = subTreeTextContent
  const prevChildrenSize = prevElement.__size
  const nextChildrenSize = nextElement.__size
  subTreeTextContent = ''

  if (prevChildrenSize === 1 && nextChildrenSize === 1) {
    const prevFirstChildKey = prevElement.__first as NodeKey
    const nextFrstChildKey = nextElement.__first as NodeKey
    if (prevFirstChildKey === nextFrstChildKey) {
      $reconcileNode(prevFirstChildKey, dom)
    } else {
      const lastDOM = getPrevElementByKeyOrThrow(prevFirstChildKey)
      const replacementDOM = $createNode(nextFrstChildKey, null, null)
      dom.replaceChild(replacementDOM, lastDOM)
      destroyNode(prevFirstChildKey, null)
    }
    const nextChildNode = activeNextNodeMap.get(nextFrstChildKey)
    if ($isTextNode(nextChildNode)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = nextChildNode.getFormat()
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = nextChildNode.getStyle()
      }
    }
  } else {
    const prevChildren = createChildrenArray(prevElement, activePrevNodeMap)
    const nextChildren = createChildrenArray(nextElement, activeNextNodeMap)

    if (prevChildrenSize === 0) {
      if (nextChildrenSize !== 0) {
        $createChildren(
          nextChildren,
          nextElement,
          0,
          nextChildrenSize - 1,
          dom,
          null,
        )
      }
    } else if (nextChildrenSize === 0) {
      if (prevChildrenSize !== 0) {
        // @ts-expect-error: internal field
        const lexicalLineBreak = dom.__lexicalLineBreak
        const canUseFastPath = lexicalLineBreak == null
        destroyChildren(
          prevChildren,
          0,
          prevChildrenSize - 1,
          canUseFastPath ? null : dom,
        )

        if (canUseFastPath) {
          // Fast path for removing DOM nodes
          dom.textContent = ''
        }
      }
    } else {
      $reconcileNodeChildren(
        nextElement,
        prevChildren,
        nextChildren,
        prevChildrenSize,
        nextChildrenSize,
        dom,
      )
    }
  }

  if ($textContentRequiresDoubleLinebreakAtEnd(nextElement)) {
    subTreeTextContent += DOUBLE_LINE_BREAK
  }

  // @ts-expect-error: internal field
  dom.__lexicalTextContent = subTreeTextContent
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent
}
/**
 * 주어진 키를 가진 노드를 조정합니다.
 *
 * @desc 이 함수는 주어진 노드 키에 해당하는 이전 노드와 다음 노드를 비교하여
 * 필요한 경우 노드를 업데이트하거나 다시 생성합니다. 텍스트 콘텐츠와 형식을
 * 추적하고, 자식 노드를 재귀적으로 조정합니다. 노드가 변경된 경우 해당 노드를
 * 업데이트하고, 변경되지 않은 경우 캐시된 텍스트 콘텐츠를 사용합니다.
 *
 * @param key - 조정할 노드의 키입니다.
 * @param parentDOM - 부모 DOM 요소입니다. null일 수 있습니다.
 * @returns 조정된 DOM 요소를 반환합니다.
 */
function $reconcileNode(
  key: NodeKey,
  parentDOM: HTMLElement | null,
): HTMLElement {
  const prevNode = activePrevNodeMap.get(key)
  let nextNode = activeNextNodeMap.get(key)

  if (prevNode === undefined || nextNode === undefined) {
    invariant(
      false,
      'reconcileNode: prevNode or nextNode does not exist in nodeMap',
    )
  }

  const isDirty =
    treatAllNodesAsDirty ||
    activeDirtyLeaves.has(key) ||
    activeDirtyElements.has(key)
  const dom = getElementByKeyOrThrow(activeEditor, key)

  // If the node key points to the same instance in both states
  // and isn't dirty, we just update the text content cache
  // and return the existing DOM Node.
  if (prevNode === nextNode && !isDirty) {
    if ($isElementNode(prevNode)) {
      // @ts-expect-error: internal field
      const previousSubTreeTextContent = dom.__lexicalTextContent

      if (previousSubTreeTextContent !== undefined) {
        subTreeTextContent += previousSubTreeTextContent
        editorTextContent += previousSubTreeTextContent
      }

      // @ts-expect-error: internal field
      const previousSubTreeDirectionTextContent = dom.__lexicalDirTextContent

      if (previousSubTreeDirectionTextContent !== undefined) {
        subTreeDirectionedTextContent += previousSubTreeDirectionTextContent
      }
    } else {
      const text = prevNode.getTextContent()

      if ($isTextNode(prevNode) && !prevNode.isDirectionless()) {
        subTreeDirectionedTextContent += text
      }

      editorTextContent += text
      subTreeTextContent += text
    }

    return dom
  }
  // If the node key doesn't point to the same instance in both maps,
  // it means it were cloned. If they're also dirty, we mark them as mutated.
  if (prevNode !== nextNode && isDirty) {
    setMutatedNode(
      mutatedNodes,
      activeEditorNodes,
      activeMutationListeners,
      nextNode,
      'updated',
    )
  }

  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorConfig)) {
    const replacementDOM = $createNode(key, null, null)

    if (parentDOM === null) {
      invariant(false, 'reconcileNode: parentDOM is null')
    }

    parentDOM.replaceChild(replacementDOM, dom)
    destroyNode(key, null)
    return replacementDOM
  }

  if ($isElementNode(prevNode) && $isElementNode(nextNode)) {
    // Reconcile element children
    const nextIndent = nextNode.__indent

    if (nextIndent !== prevNode.__indent) {
      setElementIndent(dom, nextIndent)
    }

    const nextFormat = nextNode.__format

    if (nextFormat !== prevNode.__format) {
      setElementFormat(dom, nextFormat)
    }
    if (isDirty) {
      $reconcileChildrenWithDirection(prevNode, nextNode, dom)
      if (!$isRootNode(nextNode) && !nextNode.isInline()) {
        reconcileElementTerminatingLineBreak(prevNode, nextNode, dom)
      }
    }

    if ($textContentRequiresDoubleLinebreakAtEnd(nextNode)) {
      subTreeTextContent += DOUBLE_LINE_BREAK
      editorTextContent += DOUBLE_LINE_BREAK
    }
  } else {
    const text = nextNode.getTextContent()

    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor, activeEditorConfig)

      if (decorator !== null) {
        reconcileDecorator(key, decorator)
      }
    } else if ($isTextNode(nextNode) && !nextNode.isDirectionless()) {
      // Handle text content, for LTR, LTR cases.
      subTreeDirectionedTextContent += text
    }

    subTreeTextContent += text
    editorTextContent += text
  }

  if (
    !activeEditorStateReadOnly &&
    $isRootNode(nextNode) &&
    nextNode.__cachedText !== editorTextContent
  ) {
    // Cache the latest text content.
    const nextRootNode = nextNode.getWritable()
    nextRootNode.__cachedText = editorTextContent
    nextNode = nextRootNode
  }

  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(nextNode)
  }

  return dom
}
/**
 * 데코레이터를 조정합니다.
 *
 * @desc 이 함수는 주어진 키에 해당하는 데코레이터를 현재 활성화된 에디터의
 * 펜딩 데코레이터 또는 현재 데코레이터와 비교하여 필요한 경우 펜딩 데코레이터를
 * 업데이트합니다. 만약 펜딩 데코레이터가 존재하지 않으면 현재 데코레이터를 복제합니다.
 *
 * @param key - 데코레이터를 조정할 노드의 키입니다.
 * @param decorator - 새로 설정할 데코레이터입니다.
 */
function reconcileDecorator(key: NodeKey, decorator: unknown): void {
  let pendingDecorators = activeEditor._pendingDecorators
  const currentDecorators = activeEditor._decorators

  if (pendingDecorators === null) {
    if (currentDecorators[key] === decorator) {
      return
    }

    pendingDecorators = cloneDecorators(activeEditor)
  }

  pendingDecorators[key] = decorator
}
/**
 * 주어진 요소의 첫 번째 자식을 가져옵니다.
 *
 * @desc 이 함수는 주어진 HTML 요소의 첫 번째 자식 노드를 반환합니다.
 *
 * @param element - 첫 번째 자식을 가져올 HTML 요소입니다.
 * @returns 첫 번째 자식 노드를 반환합니다. 자식이 없으면 null을 반환합니다.
 */
function getFirstChild(element: HTMLElement): Node | null {
  return element.firstChild
}
/**
 * 주어진 요소의 다음 형제를 가져옵니다.
 *
 * @desc 이 함수는 주어진 HTML 요소의 다음 형제 노드를 반환합니다.
 * 만약 다음 형제가 활성화된 에디터의 블록 커서 요소와 같으면 그 다음 형제를 반환합니다.
 *
 * @param element - 다음 형제를 가져올 HTML 요소입니다.
 * @returns 다음 형제 노드를 반환합니다. 형제가 없으면 null을 반환합니다.
 */
function getNextSibling(element: HTMLElement): Node | null {
  let nextSibling = element.nextSibling
  if (
    nextSibling !== null &&
    nextSibling === activeEditor._blockCursorElement
  ) {
    nextSibling = nextSibling.nextSibling
  }
  return nextSibling
}
/**
 * 노드의 자식 노드들을 조정합니다.
 *
 * @desc 이 함수는 주어진 이전 자식 노드 배열과 다음 자식 노드 배열을 비교하여
 * 필요한 경우 자식 노드를 생성, 업데이트 또는 제거합니다. 자식 노드 간의 일치를
 * 확인하고, 일치하지 않는 경우 해당 자식 노드를 적절하게 처리합니다. 노드 형식과
 * 스타일을 추적합니다.
 *
 * @param nextElement - 다음 요소 노드입니다.
 * @param prevChildren - 이전 자식 노드 배열입니다.
 * @param nextChildren - 다음 자식 노드 배열입니다.
 * @param prevChildrenLength - 이전 자식 노드 배열의 길이입니다.
 * @param nextChildrenLength - 다음 자식 노드 배열의 길이입니다.
 * @param dom - DOM 요소입니다.
 */
function $reconcileNodeChildren(
  nextElement: ElementNode,
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  dom: HTMLElement,
): void {
  const prevEndIndex = prevChildrenLength - 1
  const nextEndIndex = nextChildrenLength - 1
  let prevChildrenSet: Set<NodeKey> | undefined
  let nextChildrenSet: Set<NodeKey> | undefined
  let siblingDOM: null | Node = getFirstChild(dom)
  let prevIndex = 0
  let nextIndex = 0

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex]
    const nextKey = nextChildren[nextIndex]

    if (prevKey === nextKey) {
      siblingDOM = getNextSibling($reconcileNode(nextKey, dom))
      prevIndex++
      nextIndex++
    } else {
      if (prevChildrenSet === undefined) {
        prevChildrenSet = new Set(prevChildren)
      }

      if (nextChildrenSet === undefined) {
        nextChildrenSet = new Set(nextChildren)
      }

      const nextHasPrevKey = nextChildrenSet.has(prevKey)
      const prevHasNextKey = prevChildrenSet.has(nextKey)

      if (!nextHasPrevKey) {
        // Remove prev
        siblingDOM = getNextSibling(getPrevElementByKeyOrThrow(prevKey))
        destroyNode(prevKey, dom)
        prevIndex++
      } else if (!prevHasNextKey) {
        // Create next
        $createNode(nextKey, dom, siblingDOM)
        nextIndex++
      } else {
        // Move next
        const childDOM = getElementByKeyOrThrow(activeEditor, nextKey)

        if (childDOM === siblingDOM) {
          siblingDOM = getNextSibling($reconcileNode(nextKey, dom))
        } else {
          if (siblingDOM != null) {
            dom.insertBefore(childDOM, siblingDOM)
          } else {
            dom.appendChild(childDOM)
          }

          $reconcileNode(nextKey, dom)
        }

        prevIndex++
        nextIndex++
      }
    }

    const node = activeNextNodeMap.get(nextKey)
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat()
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = node.getStyle()
      }
    }
  }

  const appendNewChildren = prevIndex > prevEndIndex
  const removeOldChildren = nextIndex > nextEndIndex

  if (appendNewChildren && !removeOldChildren) {
    const previousNode = nextChildren[nextEndIndex + 1]
    const insertDOM =
      previousNode === undefined
        ? null
        : activeEditor.getElementByKey(previousNode)
    $createChildren(
      nextChildren,
      nextElement,
      nextIndex,
      nextEndIndex,
      dom,
      insertDOM,
    )
  } else if (removeOldChildren && !appendNewChildren) {
    destroyChildren(prevChildren, prevIndex, prevEndIndex, dom)
  }
}
/**
 * 루트 노드를 조정합니다.
 *
 * @desc 이 함수는 주어진 이전 에디터 상태와 다음 에디터 상태를 비교하여 루트 노드를
 * 조정합니다. 필요한 경우 노드를 업데이트하거나 다시 생성합니다. 또한, 텍스트 콘텐츠와
 * 방향 텍스트 콘텐츠를 캐시하고, 변경된 노드를 추적하여 나중에 mutation 리스너를
 * 트리거합니다.
 *
 * @param prevEditorState - 이전 에디터 상태입니다.
 * @param nextEditorState - 다음 에디터 상태입니다.
 * @param editor - Lexical 에디터 인스턴스입니다.
 * @param dirtyType - 변경 유형을 나타내는 값입니다. 0 | 1 | 2
 * @param dirtyElements - 더러운(dirty) 요소 노드의 키를 저장한 맵입니다.
 * @param dirtyLeaves - 더러운(dirty) 리프 노드의 키를 저장한 집합입니다.
 * @returns 변경된 노드의 맵을 반환합니다.
 */
export function $reconcileRoot(
  prevEditorState: EditorState,
  nextEditorState: EditorState,
  editor: LexicalEditor,
  dirtyType: 0 | 1 | 2,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
): MutatedNodes {
  // We cache text content to make retrieval more efficient.
  // The cache must be rebuilt during reconciliation to account for any changes.
  subTreeTextContent = ''
  editorTextContent = ''
  subTreeDirectionedTextContent = ''
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE
  activeTextDirection = null
  activeEditor = editor
  activeEditorConfig = editor._config
  activeEditorNodes = editor._nodes
  activeMutationListeners = activeEditor._listeners.mutation
  activeDirtyElements = dirtyElements
  activeDirtyLeaves = dirtyLeaves
  activePrevNodeMap = prevEditorState._nodeMap
  activeNextNodeMap = nextEditorState._nodeMap
  activeEditorStateReadOnly = nextEditorState._readOnly
  activePrevKeyToDOMMap = new Map(editor._keyToDOMMap)
  // We keep track of mutated nodes so we can trigger mutation
  // listeners later in the update cycle.
  const currentMutatedNodes = new Map()
  mutatedNodes = currentMutatedNodes
  $reconcileNode('root', null)
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // @ts-ignore
  activeEditor = undefined
  // @ts-ignore
  activeEditorNodes = undefined
  // @ts-ignore
  activeDirtyElements = undefined
  // @ts-ignore
  activeDirtyLeaves = undefined
  // @ts-ignore
  activePrevNodeMap = undefined
  // @ts-ignore
  activeNextNodeMap = undefined
  // @ts-ignore
  activeEditorConfig = undefined
  // @ts-ignore
  activePrevKeyToDOMMap = undefined
  // @ts-ignore
  mutatedNodes = undefined

  return currentMutatedNodes
}
/**
 * 주어진 키와 DOM 요소를 에디터의 키-DOM 맵에 저장합니다.
 *
 * @desc 이 함수는 주어진 키와 DOM 요소를 Lexical 에디터 인스턴스의 키-DOM 맵에 저장합니다.
 * 또한 DOM 요소에 에디터의 키를 추가하여 추적할 수 있도록 합니다.
 *
 * @param key - 저장할 노드의 키입니다.
 * @param dom - 저장할 DOM 요소입니다.
 * @param editor - Lexical 에디터 인스턴스입니다.
 */
export function storeDOMWithKey(
  key: NodeKey,
  dom: HTMLElement,
  editor: LexicalEditor,
): void {
  const keyToDOMMap = editor._keyToDOMMap
  // @ts-ignore We intentionally add this to the Node.
  dom['__lexicalKey_' + editor._key] = key
  keyToDOMMap.set(key, dom)
}
/**
 * 주어진 키에 해당하는 이전 DOM 요소를 반환합니다.
 *
 * @desc 이 함수는 주어진 키에 해당하는 이전 DOM 요소를 반환합니다.
 * 해당 요소가 존재하지 않으면 오류를 발생시킵니다.
 *
 * @param key - 찾고자 하는 노드의 키입니다.
 * @returns 주어진 키에 해당하는 DOM 요소입니다.
 * @throws 주어진 키에 해당하는 DOM 요소를 찾을 수 없는 경우 오류를 발생시킵니다.
 */
function getPrevElementByKeyOrThrow(key: NodeKey): HTMLElement {
  const element = activePrevKeyToDOMMap.get(key)

  if (element === undefined) {
    invariant(
      false,
      'Reconciliation: could not find DOM element for node key %s',
      key,
    )
  }

  return element
}

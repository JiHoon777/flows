import { $isAtNodeEnd } from '@lexical/selection'
import { RangeSelection } from 'lexical'

const VERTICAL_GAP = 10
const HORIZONTAL_OFFSET = 5
const SUPPORTED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'sms:',
  'tel:',
])
// Source: https://stackoverflow.com/a/8234912/2013580
const urlRegExp = new RegExp(
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/,
)

export const lexicalUtils = {
  getSelectedNode: (selection: RangeSelection) => {
    const anchor = selection.anchor
    const focus = selection.focus
    const anchorNode = selection.anchor.getNode()
    const focusNode = selection.focus.getNode()
    if (anchorNode === focusNode) {
      return anchorNode
    }
    // 선택이 역방향인지 확인합니다.
    const isBackward = selection.isBackward()
    if (isBackward) {
      /**
       *  역방향 선택에서 포커스가 노드의 끝에 위치한 경우 앵커 노드를 반환하고,
       *  그렇지 않으면 포커스 노드를 반환합니다.
       */
      return $isAtNodeEnd(focus) ? anchorNode : focusNode
    } else {
      /**
       *  순방향 선택에서 앵커가 노드의 끝에 위치한 경우 앵커 노드를 반환하고,
       *  그렇지 않으면 포커스 노드를 반환합니다.
       */
      return $isAtNodeEnd(anchor) ? anchorNode : focusNode
    }
  },
  setFloatingElemPosition: (
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    isLink: boolean = false,
    verticalGap: number = VERTICAL_GAP,
    horizontalOffset: number = HORIZONTAL_OFFSET,
  ) => {
    const scrollerElem = anchorElem.parentElement

    if (targetRect === null || !scrollerElem) {
      floatingElem.style.opacity = '0'
      floatingElem.style.transform = 'translate(-10000px, -10000px)'
      return
    }

    const floatingElemRect = floatingElem.getBoundingClientRect()
    const anchorElementRect = anchorElem.getBoundingClientRect()
    const editorScrollerRect = scrollerElem.getBoundingClientRect()

    let top = targetRect.top - floatingElemRect.height - verticalGap
    let left = targetRect.left - horizontalOffset

    // 플로팅 요소가 스크롤러 상단을 벗어나는 경우 위치 조정
    if (top < editorScrollerRect.top) {
      // adjusted height for link element if the element is at top
      top +=
        floatingElemRect.height +
        targetRect.height +
        verticalGap * (isLink ? 9 : 2)
    }

    // 플로팅 요소가 스크롤러 오른쪽을 벗어나는 경우 위치 조정
    if (left + floatingElemRect.width > editorScrollerRect.right) {
      left =
        editorScrollerRect.right - floatingElemRect.width - horizontalOffset
    }

    // 기준 요소의 위치를 기준으로 top 과 left 값 조정
    top -= anchorElementRect.top
    left -= anchorElementRect.left

    floatingElem.style.opacity = '1'
    floatingElem.style.transform = `translate(${left}px, ${top}px)`
  },
  getDOMRangeRect: (nativeSelection: Selection, rootElement: HTMLElement) => {
    const domRange = nativeSelection.getRangeAt(0)

    let rect

    if (nativeSelection.anchorNode === rootElement) {
      let inner = rootElement
      while (inner.firstElementChild != null) {
        inner = inner.firstElementChild as HTMLElement
      }
      rect = inner.getBoundingClientRect()
    } else {
      rect = domRange.getBoundingClientRect()
    }

    return rect
  },
  setFloatingElemPositionForLinkEditor: (
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    verticalGap: number = VERTICAL_GAP,
    horizontalOffset: number = HORIZONTAL_OFFSET,
  ) => {
    const scrollerElem = anchorElem.parentElement

    if (targetRect === null || !scrollerElem) {
      floatingElem.style.opacity = '0'
      floatingElem.style.transform = 'translate(-10000px, -10000px)'
      return
    }

    const floatingElemRect = floatingElem.getBoundingClientRect()
    const anchorElementRect = anchorElem.getBoundingClientRect()
    const editorScrollerRect = scrollerElem.getBoundingClientRect()

    let top = targetRect.top - verticalGap
    let left = targetRect.left - horizontalOffset

    if (top < editorScrollerRect.top) {
      top += floatingElemRect.height + targetRect.height + verticalGap * 2
    }

    if (left + floatingElemRect.width > editorScrollerRect.right) {
      left =
        editorScrollerRect.right - floatingElemRect.width - horizontalOffset
    }

    top -= anchorElementRect.top
    left -= anchorElementRect.left

    floatingElem.style.opacity = '1'
    floatingElem.style.transform = `translate(${left}px, ${top}px)`
  },
  sanitizeUrl: (url: string) => {
    try {
      const parsedUrl = new URL(url)
      // eslint-disable-next-line no-script-url
      if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
        return 'about:blank'
      }
    } catch {
      return url
    }
    return url
  },
  validateUrl: (url: string) => {
    // TODO Fix UI for link insertion; it should never default to an invalid URL such as https://.
    // Maybe show a dialog where they user can type the URL before inserting it.
    return url === 'https://' || urlRegExp.test(url)
  },
}

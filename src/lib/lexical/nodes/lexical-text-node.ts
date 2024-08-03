import type { ElementNode } from './lexical-element-node'
import { $createLineBreakNode } from './lexical-line-break-node'
import { $createTabNode } from './lexical-tab-node'
import type {
  SerializedTextNode,
  TextDetailType,
  TextFormatType,
  TextModeType,
} from './lexical-text-node.type'
import {
  COMPOSITION_SUFFIX,
  DETAIL_TYPE_TO_DETAIL,
  DOM_ELEMENT_TYPE,
  DOM_TEXT_TYPE,
  IS_BOLD,
  IS_CODE,
  IS_DIRECTIONLESS,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_NORMAL,
  IS_SEGMENTED,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_TOKEN,
  IS_UNDERLINE,
  IS_UNMERGEABLE,
  TEXT_MODE_TO_TYPE,
  TEXT_TYPE_TO_FORMAT,
  TEXT_TYPE_TO_MODE,
} from '../lexical-constants'
import type { LexicalEditor } from '../lexical-editor'
import type { EditorConfig, TextNodeThemeClasses } from '../lexical-editor.type'
import type { KlassConstructor } from '../lexical-type'

import {
  $applyNodeReplacement,
  $getCompositionKey,
  $setCompositionKey,
  getCachedClassNameArray,
  internalMarkSiblingsAsDirty,
  isHTMLElement,
  isInlineDomNode,
  toggleTextFormatType,
} from '../lexical-utils'
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  NodeKey,
} from '@/lib/lexical/lexical-node.ts'
import type {
  BaseSelection,
  RangeSelection,
} from '@/lib/lexical/lexical-selection.ts'

import { LexicalNode } from '@/lib/lexical/lexical-node.ts'
import {
  $getSelection,
  $internalMakeRangeSelection,
  $isRangeSelection,
  $updateElementSelectionOnCreateDeleteNode,
  adjustPointOffsetForMergedSibling,
} from '@/lib/lexical/lexical-selection.ts'
import { errorOnReadOnly } from '@/lib/lexical/lexical-updates.ts'
import { IS_FIREFOX } from '@/utils/environment'
import invariant from '@/utils/invariant'

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface TextNode {
  getTopLevelElement(): ElementNode | null
  getTopLevelElementOrThrow(): ElementNode
}
/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class TextNode extends LexicalNode {
  declare ['constructor']: KlassConstructor<typeof TextNode>
  __text: string
  /** @internal */
  __format: number
  /** @internal */
  __style: string
  /** @internal */
  __mode: 0 | 1 | 2 | 3
  /** @internal */
  __detail: number

  static getType(): string {
    return 'text'
  }

  static clone(node: TextNode): TextNode {
    return new TextNode(node.__text, node.__key)
  }

  constructor(text: string, key?: NodeKey) {
    super(key)
    this.__text = text
    this.__format = 0
    this.__style = ''
    this.__mode = 0
    this.__detail = 0
  }

  /**
   * TextNode에 현재 적용된 TextFormatTypes를 나타내는 32비트 정수를 반환합니다.
   * 이 메서드를 직접 사용하는 것은 권장되지 않습니다. 대신 TextNode.hasFormat 사용을 고려해보세요.
   *
   * @returns 텍스트 노드의 형식을 나타내는 숫자
   *
   * @description
   * 이 메서드는 텍스트 노드의 현재 형식 상태를 비트 플래그로 인코딩된 숫자로 반환합니다.
   * 각 비트는 특정 형식(예: 굵게, 기울임꼴, 밑줄 등)의 적용 여부를 나타냅니다.
   */
  getFormat(): number {
    const self = this.getLatest()
    return self.__format
  }
  /**
   * TextNode에 현재 적용된 TextDetailTypes를 나타내는 32비트 정수를 반환합니다.
   * 이 메서드를 직접 사용하는 것은 권장되지 않습니다.
   * 대신 TextNode.isDirectionless 또는 TextNode.isUnmergeable 사용을 고려해보세요.
   *
   * @returns 텍스트 노드의 세부 정보를 나타내는 숫자
   *
   * @description
   * 이 메서드는 텍스트 노드의 현재 세부 상태를 비트 플래그로 인코딩된 숫자로 반환합니다.
   * 각 비트는 특정 세부 속성(예: 방향성 없음, 병합 불가능 등)의 적용 여부를 나타냅니다.
   */
  getDetail(): number {
    const self = this.getLatest()
    return self.__detail
  }
  /**
   * TextNode의 모드(TextModeType)를 반환합니다.
   * 모드는 "normal", "token", 또는 "segmented" 중 하나일 수 있습니다.
   *
   * @returns TextModeType
   *
   * @description
   * 이 메서드는 텍스트 노드의 현재 모드를 반환합니다.
   * 각 모드는 텍스트 노드가 에디터에서 어떻게 동작하고 처리되는지를 결정합니다.
   * 내부적으로 저장된 모드 값을 TextModeType으로 변환하여 반환합니다.
   */
  getMode(): TextModeType {
    const self = this.getLatest()
    return TEXT_TYPE_TO_MODE[self.__mode]
  }
  /**
   * 현재 노드에 적용된 스타일을 반환합니다. 이는 DOM의 CSSText와 유사합니다.
   *
   * @returns 기본 DOM 노드에 적용된 스타일을 나타내는 CSSText와 유사한 문자열
   *
   * @description
   * 이 메서드는 텍스트 노드에 적용된 인라인 스타일을 문자열 형태로 반환합니다.
   * 반환된 스타일 문자열은 CSS 속성과 값의 세미콜론으로 구분된 목록입니다.
   */
  getStyle(): string {
    const self = this.getLatest()
    return self.__style
  }
  /**
   * 노드가 "token" 모드인지 여부를 반환합니다.
   * 토큰 모드의 TextNode는 RangeSelection을 사용하여 문자별로 탐색할 수 있지만,
   * 삭제 시에는 개별 문자가 아닌 하나의 단위로 삭제됩니다.
   *
   * @returns 노드가 토큰 모드이면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 텍스트 노드가 특별한 "token" 모드인지 확인합니다.
   * 토큰 모드는 특정 텍스트 단위(예: 멘션, 해시태그)를 단일 엔티티로 취급할 때 유용합니다.
   */
  isToken(): boolean {
    const self = this.getLatest()
    return self.__mode === IS_TOKEN
  }
  /**
   * IME(입력기) 또는 다른 서드파티 스크립트가 TextNode를 변경하려고 시도하는 것을
   * Lexical이 감지했는지 여부를 반환합니다.
   *
   * @returns IME 또는 서드파티 스크립트에 의한 변경 시도가 감지되면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 현재 TextNode가 조합(composition) 상태인지 확인합니다.
   * 조합 상태는 주로 IME를 사용한 텍스트 입력 과정에서 발생하며,
   * 이 상태에서는 텍스트 노드의 특별한 처리가 필요할 수 있습니다.
   */
  isComposing(): boolean {
    return this.__key === $getCompositionKey()
  }
  /**
   * 노드가 "segmented" (분할) 모드인지 여부를 반환합니다.
   * 분할 모드의 TextNode는 RangeSelection을 사용하여 문자별로 탐색할 수 있지만,
   * 삭제 시에는 공백으로 구분된 "세그먼트" 단위로 삭제됩니다.
   *
   * @returns 노드가 분할 모드이면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 텍스트 노드가 특별한 "segmented" 모드인지 확인합니다.
   * 분할 모드는 텍스트를 특정 단위(세그먼트)로 나누어 처리할 때 유용합니다.
   */
  isSegmented(): boolean {
    const self = this.getLatest()
    return self.__mode === IS_SEGMENTED
  }
  /**
   * 노드가 "directionless" (방향성 없음) 상태인지 여부를 반환합니다.
   * 방향성 없는 노드는 RTL(오른쪽에서 왼쪽)과 LTR(왼쪽에서 오른쪽) 모드 간의 변경을 고려하지 않습니다.
   *
   * @returns 노드가 방향성이 없으면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 텍스트 노드가 특별한 "directionless" 상태인지 확인합니다.
   * 방향성 없는 상태는 텍스트의 방향(RTL/LTR)에 영향을 받지 않아야 하는 특정 텍스트나 요소에 유용합니다.
   */
  isDirectionless(): boolean {
    // 노드의 최신 버전을 가져옵니다.
    const self = this.getLatest()

    // __detail 비트 플래그에서 IS_DIRECTIONLESS 비트가 설정되어 있는지 확인합니다.
    return (self.__detail & IS_DIRECTIONLESS) !== 0
  }
  /**
   * 노드가 "unmergeable" (병합 불가능) 상태인지 여부를 반환합니다.
   * 일부 시나리오에서 Lexical은 인접한 TextNode들을 하나의 TextNode로 병합하려고 시도합니다.
   * TextNode가 병합 불가능 상태라면, 이러한 병합이 발생하지 않습니다.
   *
   * @returns 노드가 병합 불가능 상태이면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 텍스트 노드가 특별한 "unmergeable" 상태인지 확인합니다.
   * 병합 불가능 상태는 특정 텍스트 노드의 독립성을 유지해야 할 때 유용합니다.
   */
  isUnmergeable(): boolean {
    // 노드의 최신 버전을 가져옵니다.
    const self = this.getLatest()

    return (self.__detail & IS_UNMERGEABLE) !== 0
  }
  /**
   * 노드에 주어진 형식이 적용되어 있는지 여부를 반환합니다.
   * 이 메서드는 사람이 읽기 쉬운 TextFormatType 문자열 값과 함께 사용하여
   * TextNode의 형식을 확인할 수 있습니다.
   *
   * @param type - 확인할 TextFormatType
   * @returns 노드에 주어진 형식이 적용되어 있으면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 특정 텍스트 형식(예: 굵게, 기울임꼴, 밑줄 등)이
   * 현재 텍스트 노드에 적용되어 있는지 확인합니다.
   */
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type]

    return (this.getFormat() & formatFlag) !== 0
  }
  /**
   * 노드가 "simple text" (단순 텍스트)인지 여부를 반환합니다.
   * 단순 텍스트는 문자열 타입이 "text"인 TextNode(즉, 하위 클래스가 아님)이며
   * 어떤 모드도 적용되지 않은(즉, 분할되거나 토큰화되지 않은) 노드로 정의됩니다.
   *
   * @returns 노드가 단순 텍스트이면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 텍스트 노드가 가장 기본적인 형태의 텍스트인지 확인합니다.
   * 단순 텍스트 노드는 특별한 처리나 동작이 필요 없는 일반적인 텍스트를 나타냅니다.
   */
  isSimpleText(): boolean {
    return this.__type === 'text' && this.__mode === IS_NORMAL
  }
  /**
   * 노드의 텍스트 내용을 문자열로 반환합니다.
   *
   * @returns 노드의 텍스트 내용을 나타내는 문자열
   *
   * @description
   * 이 메서드는 TextNode의 실제 텍스트 내용을 가져옵니다.
   * 노드의 가장 최신 버전을 사용하여 현재 상태의 텍스트를 반환합니다.
   */
  getTextContent(): string {
    const self = this.getLatest()
    return self.__text
  }
  /**
   * 노드에 적용된 형식 플래그를 32비트 정수로 반환합니다.
   *
   * @param type - 토글할 텍스트 형식 타입
   * @param alignWithFormat - 정렬할 형식 (null이면 토글, 아니면 해당 형식과 정렬)
   * @returns 노드에 적용된 TextFormatTypes를 나타내는 숫자
   *
   * @description
   * 이 메서드는 현재 노드의 형식을 기반으로 새로운 형식 플래그를 계산합니다.
   * 주어진 형식 타입을 토글하거나 특정 형식과 정렬하여 새로운 형식 플래그를 생성합니다.
   */
  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest()

    const format = self.__format

    return toggleTextFormatType(format, type, alignWithFormat)
  }
  /**
   * 텍스트 노드가 폰트 스타일링을 지원하는지 여부를 반환합니다.
   *
   * @returns 텍스트 노드가 폰트 스타일링을 지원하면 true, 그렇지 않으면 false를 반환합니다.
   *
   * @description
   * 이 메서드는 현재 텍스트 노드가 폰트 스타일(예: 굵게, 기울임꼴, 밑줄 등)을
   * 적용할 수 있는지 여부를 나타냅니다.
   * 기본 TextNode 클래스에서는 항상 true를 반환합니다.
   */
  canHaveFormat(): boolean {
    return true
  }

  // View

  /**
   * TextNode의 DOM 표현을 생성합니다.
   *
   * @param config - 에디터 설정
   * @param editor - (선택적) Lexical 에디터 인스턴스
   * @returns 생성된 HTML 요소
   *
   * @description
   * 이 메서드는 TextNode의 내용과 형식에 따라 적절한 DOM 구조를 생성합니다.
   * 내부 태그와 외부 태그를 구분하여 처리하고, 텍스트 내용과 스타일을 적용합니다.
   */
  createDOM(config: EditorConfig, _editor?: LexicalEditor): HTMLElement {
    const format = this.__format
    const outerTag = getElementOuterTag(this, format)
    const innerTag = getElementInnerTag(this, format)
    const tag = outerTag === null ? innerTag : outerTag
    const dom = document.createElement(tag)
    let innerDOM = dom

    if (this.hasFormat('code')) {
      dom.setAttribute('spellcheck', 'false')
    }
    if (outerTag !== null) {
      innerDOM = document.createElement(innerTag)
      dom.appendChild(innerDOM)
    }

    const text = this.__text
    createTextInnerDOM(innerDOM, this, innerTag, format, text, config)

    const style = this.__style
    if (style !== '') {
      dom.style.cssText = style
    }

    return dom
  }

  /**
   * TextNode의 DOM 표현을 업데이트합니다.
   *
   * @param prevNode - 이전 TextNode
   * @param dom - 업데이트할 DOM 요소
   * @param config - 에디터 설정
   * @returns 전체 DOM을 다시 생성해야 하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 TextNode의 변경사항을 기존 DOM에 효율적으로 적용합니다.
   * 태그 변경, 내부 구조 변경, 텍스트 내용 및 스타일 업데이트 등을 처리합니다.
   */
  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const nextText = this.__text
    const prevFormat = prevNode.__format
    const nextFormat = this.__format
    const prevOuterTag = getElementOuterTag(this, prevFormat)
    const nextOuterTag = getElementOuterTag(this, nextFormat)
    const prevInnerTag = getElementInnerTag(this, prevFormat)
    const nextInnerTag = getElementInnerTag(this, nextFormat)
    const prevTag = prevOuterTag === null ? prevInnerTag : prevOuterTag
    const nextTag = nextOuterTag === null ? nextInnerTag : nextOuterTag

    // 태그가 변경된 경우 전체 DOM을 다시 생성해야 합니다.
    if (prevTag !== nextTag) {
      return true
    }

    if (prevOuterTag === nextOuterTag && prevInnerTag !== nextInnerTag) {
      // should always be an element
      const prevInnerDOM: HTMLElement = dom.firstChild as HTMLElement
      if (prevInnerDOM == null) {
        invariant(false, 'updateDOM: prevInnerDOM is null or undefined')
      }
      const nextInnerDOM = document.createElement(nextInnerTag)
      createTextInnerDOM(
        nextInnerDOM,
        this,
        nextInnerTag,
        nextFormat,
        nextText,
        config,
      )
      dom.replaceChild(nextInnerDOM, prevInnerDOM)
      return false
    }

    // 내부 DOM 요소를 결정합니다.
    let innerDOM = dom
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        innerDOM = dom.firstChild as HTMLElement
        if (innerDOM == null) {
          invariant(false, 'updateDOM: innerDOM is null or undefined')
        }
      }
    }

    // 텍스트 내용을 업데이트합니다.
    setTextContent(nextText, innerDOM, this)

    const theme = config.theme
    // 테마 클래스 이름을 적용합니다.
    const textClassNames = theme.text
    if (textClassNames !== undefined && prevFormat !== nextFormat) {
      setTextThemeClassNames(
        nextInnerTag,
        prevFormat,
        nextFormat,
        innerDOM,
        textClassNames,
      )
    }

    // 스타일을 업데이트합니다.
    const prevStyle = prevNode.__style
    const nextStyle = this.__style
    if (prevStyle !== nextStyle) {
      dom.style.cssText = nextStyle
    }

    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      '#text': () => ({
        conversion: $convertTextDOMNode,
        priority: 0,
      }),
      b: () => ({
        conversion: convertBringAttentionToElement,
        priority: 0,
      }),
      code: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      em: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      i: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      s: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      span: () => ({
        conversion: convertSpanElement,
        priority: 0,
      }),
      strong: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      sub: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      sup: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      u: () => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
    }
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    const node = $createTextNode(serializedNode.text)
    node.setFormat(serializedNode.format)
    node.setDetail(serializedNode.detail)
    node.setMode(serializedNode.mode)
    node.setStyle(serializedNode.style)
    return node
  }

  /**
   * TextNode의 DOM 표현을 내보냅니다.
   *
   * @param editor - Lexical 에디터 인스턴스
   * @returns DOMExportOutput - 내보낸 DOM 요소를 포함하는 객체
   *
   * @description
   * 이 메서드는 TextNode의 DOM 표현을 생성하고 내보냅니다.
   * 복사+붙여넣기 시 기본 텍스트 출력을 개선하고,
   * CSS 클래스를 사용할 수 없는 헤드리스 모드에서의 HTML 콘텐츠 생성을 지원합니다.
   * 텍스트 서식(굵게, 기울임꼴, 취소선, 밑줄)을 적용하기 위해
   * 시맨틱적으로 부정확하지만 널리 지원되는 <b>, <i>, <s>, <u> 요소를 사용합니다.
   */
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    let { element } = super.exportDOM(editor)
    invariant(
      element !== null && isHTMLElement(element),
      'Expected TextNode createDOM to always return a HTMLElement',
    )
    element.style.whiteSpace = 'pre-wrap'
    // This is the only way to properly add support for most clients,
    // even if it's semantically incorrect to have to resort to using
    // <b>, <u>, <s>, <i> elements.
    if (this.hasFormat('bold')) {
      element = wrapElementWith(element, 'b')
    }
    if (this.hasFormat('italic')) {
      element = wrapElementWith(element, 'i')
    }
    if (this.hasFormat('strikethrough')) {
      element = wrapElementWith(element, 's')
    }
    if (this.hasFormat('underline')) {
      element = wrapElementWith(element, 'u')
    }

    return {
      element,
    }
  }

  exportJSON(): SerializedTextNode {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      type: 'text',
      version: 1,
    }
  }

  // Mutators

  selectionTransform(
    _prevSelection: null | BaseSelection,
    _nextSelection: RangeSelection,
  ): void {
    return
  }
  /**
   * 노드의 형식을 제공된 TextFormatType 또는 32비트 정수로 설정합니다.
   * TextFormatType 버전의 인자는 하나의 형식만 지정할 수 있으며,
   * 이를 사용하면 노드에 적용된 다른 모든 형식이 제거됩니다.
   * 토글 동작을 원한다면 {@link TextNode.toggleFormat}를 사용하는 것을 고려하세요.
   *
   * @param format - 노드 형식을 나타내는 TextFormatType 또는 32비트 정수
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 텍스트 노드의 형식을 설정합니다. 문자열(TextFormatType)이나
   * 숫자(32비트 정수) 형태의 형식을 받아 노드에 적용합니다.
   * 문자열 형식을 사용할 경우 기존의 모든 형식이 제거되고 새 형식만 적용됩니다.
   *
   * @example
   * node.setFormat('bold'); // 모든 기존 형식을 제거하고 굵게만 설정
   * node.setFormat(0b101); // 32비트 정수로 여러 형식 동시 설정
   *
   */
  setFormat(format: TextFormatType | number): this {
    const self = this.getWritable()
    self.__format =
      typeof format === 'string' ? TEXT_TYPE_TO_FORMAT[format] : format
    return self
  }
  /**
   * 노드의 세부 사항을 제공된 TextDetailType 또는 32비트 정수로 설정합니다.
   * TextDetailType 버전의 인자는 하나의 세부 사항 값만 지정할 수 있으며,
   * 이를 사용하면 노드에 적용된 다른 모든 세부 사항 값이 제거됩니다.
   * 토글 동작을 원한다면 {@link TextNode.toggleDirectionless}
   * 또는 {@link TextNode.toggleUnmergeable}를 사용하는 것을 고려하세요.
   *
   * @param detail - 노드 세부 사항을 나타내는 TextDetailType 또는 32비트 정수
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 텍스트 노드의 세부 사항을 설정합니다. 문자열(TextDetailType)이나
   * 숫자(32비트 정수) 형태의 세부 사항을 받아 노드에 적용합니다.
   * 문자열 형식을 사용할 경우 기존의 모든 세부 사항이 제거되고 새 세부 사항만 적용됩니다.
   *
   * @example
   * node.setDetail('directionless'); // 모든 기존 세부 사항을 제거하고 방향성 없음만 설정
   * node.setDetail(0b11); // 32비트 정수로 여러 세부 사항 동시 설정
   *
   */
  setDetail(detail: TextDetailType | number): this {
    const self = this.getWritable()
    self.__detail =
      typeof detail === 'string' ? DETAIL_TYPE_TO_DETAIL[detail] : detail
    return self
  }
  /**
   * 노드의 스타일을 제공된 CSSText와 유사한 문자열로 설정합니다.
   * 이 속성은 HTMLElement의 style 속성처럼 사용하여
   * 기본 DOM 요소에 인라인 스타일을 적용할 수 있습니다.
   *
   * @param style - 기본 HTMLElement에 적용될 CSSText
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 텍스트 노드에 인라인 CSS 스타일을 설정합니다.
   * 제공된 스타일 문자열은 직접 노드의 DOM 표현에 적용됩니다.
   *
   * @example
   * node.setStyle('color: red; font-weight: bold;');
   *
   * @note
   * 이 메서드로 설정된 스타일은 노드의 DOM 표현이 생성되거나
   * 업데이트될 때 적용됩니다.
   */
  setStyle(style: string): this {
    const self = this.getWritable()
    self.__style = style
    return self
  }
  /**
   * 제공된 형식이 이 TextNode에 없으면 적용하고, 있으면 제거합니다.
   * 아래 첨자와 위 첨자 형식은 상호 배타적입니다.
   * 특정 형식을 켜고 끄는 데에는 이 메서드를 사용하는 것이 좋습니다.
   *
   * @param type - 토글할 TextFormatType
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 지정된 텍스트 형식을 토글합니다. 즉, 형식이 적용되어 있지 않으면
   * 적용하고, 이미 적용되어 있으면 제거합니다. 이는 개별 형식을
   * 효율적으로 관리하는 데 유용합니다.
   *
   * @note
   * 아래 첨자(subscript)와 위 첨자(superscript) 형식은 동시에 적용될 수 없습니다.
   * 하나를 적용하면 다른 하나는 자동으로 제거됩니다.
   *
   * @example
   * node.toggleFormat('bold');  // 굵은 글씨를 켜거나 끕니다.
   * node.toggleFormat('italic');  // 이탤릭체를 켜거나 끕니다.
   *
   * @see {@link TextFormatType} 지원되는 형식 타입 목록
   */
  toggleFormat(type: TextFormatType): this {
    const format = this.getFormat()
    const newFormat = toggleTextFormatType(format, type, null)
    return this.setFormat(newFormat)
  }
  /**
   * 노드의 방향성 없음(directionless) 세부 값을 토글합니다.
   * setDetail 메서드 대신 이 메서드를 사용하는 것이 좋습니다.
   *
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 노드의 방향성 없음 속성을 켜거나 끕니다.
   * 방향성 없음 노드는 텍스트 방향(RTL/LTR)에 영향을 받지 않습니다.
   *
   * @example
   * node.toggleDirectionless();  // 방향성 없음 속성을 켜거나 끕니다.
   */
  toggleDirectionless(): this {
    const self = this.getWritable()
    self.__detail ^= IS_DIRECTIONLESS
    return self
  }

  /**
   * 노드의 병합 불가능(unmergeable) 세부 값을 토글합니다.
   * setDetail 메서드 대신 이 메서드를 사용하는 것이 좋습니다.
   *
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 노드의 병합 불가능 속성을 켜거나 끕니다.
   * 병합 불가능 노드는 인접한 텍스트 노드와 자동으로 병합되지 않습니다.
   *
   * @example
   * node.toggleUnmergeable();  // 병합 불가능 속성을 켜거나 끕니다.
   */
  toggleUnmergeable(): this {
    const self = this.getWritable()
    self.__detail ^= IS_UNMERGEABLE
    return self
  }

  /**
   * 노드의 모드를 설정합니다.
   *
   * @param type - 설정할 TextModeType
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 텍스트 노드의 모드를 변경합니다.
   * 모드는 노드의 동작 방식을 결정합니다(예: 일반, 토큰, 세그먼트).
   *
   * @example
   * node.setMode('token');  // 노드를 토큰 모드로 설정합니다.
   *
   * @see {@link TextModeType} 지원되는 모드 타입 목록
   */
  setMode(type: TextModeType): this {
    const mode = TEXT_MODE_TO_TYPE[type]
    if (this.__mode === mode) {
      return this
    }
    const self = this.getWritable()
    self.__mode = mode
    return self
  }
  /**
   * Sets the text content of the node.
   *
   * @param text - the string to set as the text value of the node.
   *
   * @returns this TextNode.
   */
  setTextContent(text: string): this {
    if (this.__text === text) {
      return this
    }
    const self = this.getWritable()
    self.__text = text
    return self
  }

  /**
   * 이 TextNode의 지정된 오프셋에 앵커와 포커스를 가진 RangeSelection으로
   * 현재 Lexical 선택을 설정합니다.
   *
   * @param _anchorOffset - Selection 앵커가 위치할 오프셋
   * @param _focusOffset - Selection 포커스가 위치할 오프셋
   * @returns 새로운 RangeSelection
   *
   * @description
   * 이 메서드는 현재 TextNode를 기반으로 새로운 선택 영역을 생성하거나
   * 기존 선택 영역을 수정합니다. 오프셋이 제공되지 않으면 텍스트의
   * 끝을 기본값으로 사용합니다.
   *
   * @throws 읽기 전용 모드에서 호출될 경우 오류를 발생시킵니다.
   *
   * @example
   * 노드의 시작부터 끝까지 선택
   * node.select(0);
   *
   * 노드의 특정 범위 선택
   * node.select(5, 10);
   *
   * @note
   * - 텍스트가 비어 있거나 정의되지 않은 경우, 앵커와 포커스 오프셋은 0으로 설정됩니다.
   * - 기존 RangeSelection이 있는 경우 해당 선택을 수정합니다.
   * - 컴포지션 중인 경우 컴포지션 키를 현재 노드로 업데이트합니다.
   */
  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
    errorOnReadOnly()
    let anchorOffset = _anchorOffset
    let focusOffset = _focusOffset
    const selection = $getSelection()
    const text = this.getTextContent()
    const key = this.__key
    if (typeof text === 'string') {
      const lastOffset = text.length
      if (anchorOffset === undefined) {
        anchorOffset = lastOffset
      }
      if (focusOffset === undefined) {
        focusOffset = lastOffset
      }
    } else {
      anchorOffset = 0
      focusOffset = 0
    }
    if (!$isRangeSelection(selection)) {
      return $internalMakeRangeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'text',
        'text',
      )
    } else {
      const compositionKey = $getCompositionKey()
      if (
        compositionKey === selection.anchor.key ||
        compositionKey === selection.focus.key
      ) {
        $setCompositionKey(key)
      }
      selection.setTextNodeRange(this, anchorOffset, this, focusOffset)
    }
    return selection
  }
  selectStart(): RangeSelection {
    return this.select(0, 0)
  }

  selectEnd(): RangeSelection {
    const size = this.getTextContentSize()
    return this.select(size, size)
  }
  /**
   * 제공된 텍스트를 이 TextNode의 지정된 오프셋에 삽입하고,
   * 지정된 수의 문자를 삭제합니다. 선택적으로 작업 완료 후
   * 새로운 선택 영역을 계산할 수 있습니다.
   *
   * @param offset - 분할 작업이 시작될 오프셋
   * @param delCount - 오프셋부터 시작하여 삭제할 문자 수
   * @param newText - 오프셋에 삽입할 새 텍스트
   * @param moveSelection - 선택 사항, 삽입된 부분 문자열의 끝으로 선택 영역을 이동할지 여부
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 텍스트 노드의 내용을 수정하는 복잡한 작업을 수행합니다:
   * 1. 지정된 오프셋에서 시작하여 특정 수의 문자를 삭제합니다.
   * 2. 삭제된 위치에 새 텍스트를 삽입합니다.
   * 3. 선택적으로 선택 영역을 새로 삽입된 텍스트의 끝으로 이동합니다.
   *
   * @note
   * - 음수 오프셋은 텍스트의 끝에서부터의 위치로 해석됩니다.
   * - 오프셋이 텍스트 길이를 초과하면 텍스트의 끝에 새 텍스트가 추가됩니다.
   * - moveSelection이 true이고 현재 선택이 RangeSelection인 경우에만 선택 영역이 이동됩니다.
   *
   * @example
   * "Hello world"라는 텍스트를 가진 노드에서
   * node.spliceText(6, 5, "Lexical", true);
   * 결과: "Hello Lexical", 선택 영역은 'l' 다음에 위치
   */
  spliceText(
    offset: number,
    delCount: number,
    newText: string,
    moveSelection?: boolean,
  ): TextNode {
    const writableSelf = this.getWritable()
    const text = writableSelf.__text
    const handledTextLength = newText.length
    let index = offset
    if (index < 0) {
      index = handledTextLength + index
      if (index < 0) {
        index = 0
      }
    }
    const selection = $getSelection()
    if (moveSelection && $isRangeSelection(selection)) {
      const newOffset = offset + handledTextLength
      selection.setTextNodeRange(
        writableSelf,
        newOffset,
        writableSelf,
        newOffset,
      )
    }

    const updatedText =
      text.slice(0, index) + newText + text.slice(index + delCount)

    writableSelf.__text = updatedText
    return writableSelf
  }
  /**
   * 이 메서드는 TextNode의 하위 클래스에서 재정의하여 사용됩니다.
   * 사용자 이벤트로 인해 에디터에서 해당 노드 앞에 텍스트가 삽입되려 할 때의
   * 동작을 제어합니다.
   *
   * @returns 노드 앞에 텍스트를 삽입할 수 있으면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 텍스트 삽입 동작을 세밀하게 제어하는 데 사용됩니다:
   * - true를 반환하면 Lexical은 이 노드에 텍스트를 삽입하려고 시도합니다.
   * - false를 반환하면 Lexical은 새로운 형제 노드에 텍스트를 삽입합니다.
   *
   * @note
   * - 기본 구현은 항상 true를 반환합니다.
   * - 특정 유형의 TextNode에 대해 다른 동작이 필요한 경우 이 메서드를 재정의해야 합니다.
   *
   * @example
   * class SpecialTextNode extends TextNode {
   *   canInsertTextBefore(): boolean {
   *     특정 조건에 따라 텍스트 삽입 허용 여부 결정
   *     return this.getLength() < 10;
   *   }
   * }
   */
  canInsertTextBefore(): boolean {
    return true
  }
  /**
   * 이 메서드는 TextNode의 하위 클래스에서 재정의하여 사용됩니다.
   * 사용자 이벤트로 인해 에디터에서 해당 노드 뒤에 텍스트가 삽입되려 할 때의
   * 동작을 제어합니다.
   *
   * @returns 노드 뒤에 텍스트를 삽입할 수 있으면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 텍스트 삽입 동작을 세밀하게 제어하는 데 사용됩니다:
   * - true를 반환하면 Lexical은 이 노드에 텍스트를 삽입하려고 시도합니다.
   * - false를 반환하면 Lexical은 새로운 형제 노드에 텍스트를 삽입합니다.
   *
   * @note
   * - 기본 구현은 항상 true를 반환합니다.
   * - 특정 유형의 TextNode에 대해 다른 동작이 필요한 경우 이 메서드를 재정의해야 합니다.
   * - 이 메서드는 canInsertTextBefore와 쌍을 이루어 노드 앞뒤의 텍스트 삽입 동작을 제어합니다.
   *
   * @example
   * class LimitedTextNode extends TextNode {
   *   canInsertTextAfter(): boolean {
   *     // 노드의 텍스트 길이가 20자 미만일 때만 텍스트 삽입 허용
   *     return this.getTextContent().length < 20;
   *   }
   * }
   */
  canInsertTextAfter(): boolean {
    return true
  }
  /**
   * 제공된 문자 오프셋에서 이 TextNode를 분할하여 새로운 TextNode들을 형성하고,
   * 이들을 에디터에 삽입하여 분할된 원래 노드를 대체합니다.
   *
   * @param splitOffsets - 이 노드를 분할할 텍스트 내용의 문자 오프셋들 (나머지 매개변수)
   * @returns 새로 생성된 TextNode들의 배열
   *
   * @description
   * 이 메서드는 복잡한 텍스트 분할 작업을 수행합니다:
   * 1. 지정된 오프셋에서 텍스트를 여러 부분으로 나눕니다.
   * 2. 각 부분에 대해 새로운 TextNode를 생성합니다.
   * 3. 새로운 노드들을 원래 노드의 위치에 삽입합니다.
   * 4. 선택 영역과 컴포지션 상태를 적절히 조정합니다.
   *
   * @note
   * - 읽기 전용 모드에서 호출하면 오류가 발생합니다.
   * - 분할 결과 변경이 없으면 원래 노드만 포함하는 배열을 반환합니다.
   * - 세그먼트된 노드의 경우 첫 부분에 대해 새 노드를 생성합니다.
   * - 선택 영역이 분할된 노드에 걸쳐 있을 경우 적절히 조정됩니다.
   *
   * @example
   * const node = $createTextNode("Hello world");
   * const splitNodes = node.splitText(5);
   * 결과: ["Hello", " world"]
   * @example
   * 여러 오프셋 예시
   * const node = $createTextNode("The quick brown fox");
   * const splitNodes = node.splitText(4, 10, 16);
   * 결과: ["The ", "quick ", "brown ", "fox"]
   */
  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    errorOnReadOnly()
    const self = this.getLatest()
    const textContent = self.getTextContent()
    const key = self.__key
    const compositionKey = $getCompositionKey()
    const offsetsSet = new Set(splitOffsets)
    const parts = []
    const textLength = textContent.length
    let string = ''
    for (let i = 0; i < textLength; i++) {
      if (string !== '' && offsetsSet.has(i)) {
        parts.push(string)
        string = ''
      }
      string += textContent[i]
    }
    if (string !== '') {
      parts.push(string)
    }
    const partsLength = parts.length
    if (partsLength === 0) {
      return []
    } else if (parts[0] === textContent) {
      return [self]
    }
    const firstPart = parts[0]
    const parent = self.getParentOrThrow()
    let writableNode
    const format = self.getFormat()
    const style = self.getStyle()
    const detail = self.__detail
    let hasReplacedSelf = false

    if (self.isSegmented()) {
      // Create a new TextNode
      writableNode = $createTextNode(firstPart)
      writableNode.__format = format
      writableNode.__style = style
      writableNode.__detail = detail
      hasReplacedSelf = true
    } else {
      // For the first part, update the existing node
      writableNode = self.getWritable()
      writableNode.__text = firstPart
    }

    // Handle selection
    const selection = $getSelection()

    // Then handle all other parts
    const splitNodes: TextNode[] = [writableNode]
    let textSize = firstPart.length

    for (let i = 1; i < partsLength; i++) {
      const part = parts[i]
      const partSize = part.length
      const sibling = $createTextNode(part).getWritable()
      sibling.__format = format
      sibling.__style = style
      sibling.__detail = detail
      const siblingKey = sibling.__key
      const nextTextSize = textSize + partSize

      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor
        const focus = selection.focus

        if (
          anchor.key === key &&
          anchor.type === 'text' &&
          anchor.offset > textSize &&
          anchor.offset <= nextTextSize
        ) {
          anchor.key = siblingKey
          anchor.offset -= textSize
          selection.dirty = true
        }
        if (
          focus.key === key &&
          focus.type === 'text' &&
          focus.offset > textSize &&
          focus.offset <= nextTextSize
        ) {
          focus.key = siblingKey
          focus.offset -= textSize
          selection.dirty = true
        }
      }
      if (compositionKey === key) {
        $setCompositionKey(siblingKey)
      }
      textSize = nextTextSize
      splitNodes.push(sibling)
    }

    // Insert the nodes into the parent's children
    internalMarkSiblingsAsDirty(this)
    const writableParent = parent.getWritable()
    const insertionIndex = this.getIndexWithinParent()
    if (hasReplacedSelf) {
      writableParent.splice(insertionIndex, 0, splitNodes)
      this.remove()
    } else {
      writableParent.splice(insertionIndex, 1, splitNodes)
    }

    if ($isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(
        selection,
        parent,
        insertionIndex,
        partsLength - 1,
      )
    }

    return splitNodes
  }
  /**
   * 대상 TextNode를 이 TextNode에 병합하고, 대상 노드를 제거합니다.
   *
   * @param target - 이 노드에 병합할 TextNode
   * @returns 이 TextNode
   *
   * @description
   * 이 메서드는 주어진 대상 TextNode의 내용을 현재 노드에 병합합니다:
   * 1. 대상 노드가 이전 또는 다음 형제 노드인지 확인합니다.
   * 2. 컴포지션 키를 적절히 조정합니다.
   * 3. 선택 영역이 있다면 병합에 맞게 조정합니다.
   * 4. 두 노드의 텍스트 내용을 병합합니다.
   * 5. 대상 노드를 제거합니다.
   *
   * @throws 대상 노드가 이전 또는 다음 형제 노드가 아닌 경우 오류를 발생시킵니다.
   *
   * @example
   * const node1 = $createTextNode("Hello ");
   * const node2 = $createTextNode("world");
   * node1.insertAfter(node2);
   * node1.mergeWithSibling(node2);
   * 결과: node1의 텍스트는 "Hello world"가 되고, node2는 제거됩니다.
   */
  mergeWithSibling(target: TextNode): TextNode {
    const isBefore = target === this.getPreviousSibling()
    if (!isBefore && target !== this.getNextSibling()) {
      invariant(
        false,
        'mergeWithSibling: sibling must be a previous or next sibling',
      )
    }
    const key = this.__key
    const targetKey = target.__key
    const text = this.__text
    const textLength = text.length
    const compositionKey = $getCompositionKey()

    if (compositionKey === targetKey) {
      $setCompositionKey(key)
    }
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor
      const focus = selection.focus
      if (anchor !== null && anchor.key === targetKey) {
        adjustPointOffsetForMergedSibling(
          anchor,
          isBefore,
          key,
          target,
          textLength,
        )
        selection.dirty = true
      }
      if (focus !== null && focus.key === targetKey) {
        adjustPointOffsetForMergedSibling(
          focus,
          isBefore,
          key,
          target,
          textLength,
        )
        selection.dirty = true
      }
    }
    const targetText = target.__text
    const newText = isBefore ? targetText + text : text + targetText
    this.setTextContent(newText)
    const writableSelf = this.getWritable()
    target.remove()
    return writableSelf
  }

  /**
   * 이 노드가 "텍스트 엔티티"로 취급되어야 하는지 여부를 반환합니다.
   *
   * @returns 노드가 "텍스트 엔티티"로 취급되어야 하면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 TextNode 하위 클래스에서 재정의하여 사용됩니다.
   * registerLexicalTextEntity 함수와 함께 사용될 때 노드의 동작을 제어합니다.
   * registerLexicalTextEntity를 사용하여 생성하고 일치하는 텍스트를 대체하는
   * 노드 클래스는 이 메서드에서 true를 반환해야 합니다.
   *
   * @note
   * 기본 구현은 항상 false를 반환합니다.
   *
   * @example
   * class MyTextEntityNode extends TextNode {
   *   isTextEntity(): boolean {
   *     return true;
   *   }
   * }
   */
  isTextEntity(): boolean {
    return false
  }
}

export function $isTextNode(
  node: LexicalNode | null | undefined,
): node is TextNode {
  return node instanceof TextNode
}

/**
 * 텍스트 노드의 형식에 따라 외부 HTML 태그를 결정하는 함수
 *
 * @param node - 검사할 텍스트 노드
 * @param format - 텍스트 노드의 형식을 나타내는 비트 플래그
 * @returns 해당하는 HTML 태그 문자열 또는 null
 *
 * @description
 * 이 함수는 주어진 텍스트 노드의 형식에 따라 적절한 HTML 외부 태그를 결정합니다.
 * 형식은 비트 플래그로 표현되며, 여러 형식이 동시에 적용될 수 있습니다.
 * 우선순위에 따라 첫 번째로 일치하는 형식의 태그를 반환합니다.
 */
function getElementOuterTag(_node: TextNode, format: number): string | null {
  if (format & IS_CODE) {
    return 'code'
  }
  if (format & IS_HIGHLIGHT) {
    return 'mark'
  }
  if (format & IS_SUBSCRIPT) {
    return 'sub'
  }
  if (format & IS_SUPERSCRIPT) {
    return 'sup'
  }
  return null
}

/**
 * 텍스트 노드의 형식에 따라 내부 HTML 태그를 결정하는 함수
 *
 * @param node - 검사할 텍스트 노드
 * @param format - 텍스트 노드의 형식을 나타내는 비트 플래그
 * @returns 해당하는 HTML 태그 문자열
 *
 * @description
 * 이 함수는 주어진 텍스트 노드의 형식에 따라 적절한 HTML 내부 태그를 결정합니다.
 * 형식은 비트 플래그로 표현되며, 가장 우선순위가 높은 형식의 태그를 반환합니다.
 * 일치하는 형식이 없는 경우 기본값으로 'span' 태그를 반환합니다.
 */
function getElementInnerTag(_node: TextNode, format: number): string {
  if (format & IS_BOLD) {
    return 'strong'
  }
  if (format & IS_ITALIC) {
    return 'em'
  }
  return 'span'
}

/**
 * 텍스트 노드의 테마 클래스 이름을 설정하는 함수
 *
 * @param tag - HTML 태그 이름
 * @param prevFormat - 이전 텍스트 형식
 * @param nextFormat - 새로운 텍스트 형식
 * @param dom - 대상 DOM 요소
 * @param textClassNames - 텍스트 노드 테마 클래스 정보
 *
 * @description
 * 이 함수는 텍스트 노드의 형식 변경에 따라 DOM 요소의 클래스를 업데이트합니다.
 * 기본 테마, 특수 케이스(밑줄+취소선), 그리고 개별 형식에 대한 클래스를 처리합니다.
 */
function setTextThemeClassNames(
  _tag: string,
  prevFormat: number,
  nextFormat: number,
  dom: HTMLElement,
  textClassNames: TextNodeThemeClasses,
): void {
  const domClassList = dom.classList

  // Firstly we handle the base theme.
  let classNames = getCachedClassNameArray(textClassNames, 'base')
  if (classNames !== undefined) {
    domClassList.add(...classNames)
  }

  // 두 번째로, 특수한 경우인 밑줄 + 취소선을 처리합니다.
  // 이렇게 해야 하는 이유는 동일한 CSS 속성인 text-decoration을 사용해야 한다는 사실을
  // 조합할 방법이 필요하기 때문입니다.
  // 이상적인 세상에서는 이렇게 할 필요가 없겠지만, 현재 많은 atomic CSS 시스템에서는
  // 쉬운 해결책이 없습니다.
  classNames = getCachedClassNameArray(textClassNames, 'underlineStrikethrough')
  let hasUnderlineStrikethrough = false
  const prevUnderlineStrikethrough =
    prevFormat & IS_UNDERLINE & prevFormat & IS_STRIKETHROUGH
  const nextUnderlineStrikethrough =
    nextFormat & IS_UNDERLINE & nextFormat & IS_STRIKETHROUGH

  if (classNames !== undefined) {
    if (nextUnderlineStrikethrough) {
      hasUnderlineStrikethrough = true
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames)
      } else if (prevUnderlineStrikethrough) {
        domClassList.remove(...classNames)
      }
    }
  }

  for (const key in TEXT_TYPE_TO_FORMAT) {
    const format = key as TextFormatType
    const flag = TEXT_TYPE_TO_FORMAT[format]
    classNames = getCachedClassNameArray(textClassNames, format)

    if (classNames === undefined) {
      continue
    }

    if (nextFormat & flag) {
      // 밑줄+취소선 특수 케이스 처리
      if (
        hasUnderlineStrikethrough &&
        (format === 'underline' || format === 'strikethrough')
      ) {
        if (prevFormat & flag) {
          domClassList.remove(...classNames)
        }
        continue
      }

      // 새로운 형식 추가 또는 특수 케이스에서 개별 형식으로 전환
      if (
        (prevFormat & flag) === 0 ||
        (prevUnderlineStrikethrough && format === 'underline') ||
        format === 'strikethrough'
      ) {
        domClassList.add(...classNames)
      }
    } else if (prevFormat & flag) {
      domClassList.remove(...classNames)
    }
  }
}

/**
 * 두 문자열 간의 차이를 계산하는 함수
 *
 * @param a - 비교할 첫 번째 문자열
 * @param b - 비교할 두 번째 문자열
 * @returns [시작 인덱스, 제거된 문자 수, 삽입된 문자열]
 *
 * @description
 * 이 함수는 두 문자열을 비교하여 차이점을 찾습니다.
 * 반환값은 다음과 같은 의미를 가집니다:
 * - 시작 인덱스: 차이가 시작되는 위치
 * - 제거된 문자 수: 첫 번째 문자열에서 제거된 문자의 수
 * - 삽입된 문자열: 두 번째 문자열에 새로 삽입된 문자열
 */

function diffComposedText(a: string, b: string): [number, number, string] {
  const aLength = a.length
  const bLength = b.length
  let left = 0
  let right = 0

  // 왼쪽에서부터 공통된 부분 찾기
  while (left < aLength && left < bLength && a[left] === b[left]) {
    left++
  }

  // 오른쪽에서부터 공통된 부분 찾기
  while (
    right + left < aLength &&
    right + left < bLength &&
    a[aLength - right - 1] === b[bLength - right - 1]
  ) {
    right++
  }

  // [시작 인덱스, 제거된 문자 수, 삽입된 문자열] 반환
  return [left, aLength - left - right, b.slice(left, bLength - right)]
}

/**
 * DOM 요소의 텍스트 내용을 설정하는 함수
 *
 * @param nextText - 설정할 새로운 텍스트
 * @param dom - 텍스트를 설정할 DOM 요소
 * @param node - 관련된 TextNode 객체
 *
 * @description
 * 이 함수는 주어진 DOM 요소의 텍스트 내용을 효율적으로 업데이트합니다.
 * 특히 텍스트 조합(composition) 상태와 브라우저 특정 동작을 고려합니다.
 */
function setTextContent(
  nextText: string,
  dom: HTMLElement,
  node: TextNode,
): void {
  const firstChild = dom.firstChild
  const isComposing = node.isComposing()
  // 노드가 조합 중이면 항상 접미사를 추가
  const suffix = isComposing ? COMPOSITION_SUFFIX : ''
  const text: string = nextText + suffix

  // 자식 노드가 없으면 새로운 텍스트 내용을 직접 설정
  if (firstChild == null) {
    dom.textContent = text
  } else {
    const nodeValue = firstChild.nodeValue
    if (nodeValue === text) {
      return
    }

    if (isComposing || IS_FIREFOX) {
      // Firefox에서는 맞춤법 검사 빨간 줄이 깜빡이는 것을 방지하기 위해
      // 조합 중인 텍스트에 대해 diff 알고리즘을 사용합니다.
      const [index, remove, insert] = diffComposedText(
        nodeValue as string,
        text,
      )
      if (remove !== 0) {
        // 변경된 부분 삭제
        // @ts-expect-error
        firstChild.deleteData(index, remove)
      }
      // 새로운 텍스트 삽입
      // @ts-expect-error
      firstChild.insertData(index, insert)
    } else {
      // 다른 브라우저에서는 전체 텍스트를 한 번에 교체
      firstChild.nodeValue = text
    }
  }
}

/**
 * 텍스트 노드의 내부 DOM을 생성하고 설정하는 함수
 *
 * @param innerDOM - 내부 DOM 요소
 * @param node - 텍스트 노드 객체
 * @param innerTag - 내부 태그 이름
 * @param format - 텍스트 형식
 * @param text - 설정할 텍스트 내용
 * @param config - 에디터 설정 객체
 *
 * @description
 * 이 함수는 텍스트 노드의 내부 DOM을 생성하고, 텍스트 내용을 설정하며,
 * 테마에 따른 클래스 이름을 적용합니다.
 */
function createTextInnerDOM(
  innerDOM: HTMLElement,
  node: TextNode,
  innerTag: string,
  format: number,
  text: string,
  config: EditorConfig,
): void {
  setTextContent(text, innerDOM, node)
  const theme = config.theme
  // Apply theme class names
  const textClassNames = theme.text

  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames)
  }
}

/**
 * 주어진 요소를 새로운 HTML 요소로 감싸는 함수
 *
 * @param element - 감싸질 HTML 요소 또는 텍스트 노드
 * @param tag - 새로 생성할 HTML 요소의 태그 이름
 * @returns 새로 생성된 HTML 요소
 *
 * @description
 * 이 함수는 주어진 HTML 요소나 텍스트 노드를 새로운 HTML 요소로 감쌉니다.
 * 주로 DOM 구조를 동적으로 변경하거나 요소에 추가적인 의미나 스타일을 부여할 때 사용됩니다.
 */
function wrapElementWith(
  element: HTMLElement | Text,
  tag: string,
): HTMLElement {
  const el = document.createElement(tag)
  el.appendChild(element)
  return el
}

function convertSpanElement(domNode: HTMLSpanElement): DOMConversionOutput {
  // domNode is a <span> since we matched it by nodeName
  const span = domNode
  const style = span.style

  return {
    forChild: applyTextFormatFromStyle(style),
    node: null,
  }
}

function convertBringAttentionToElement(
  domNode: HTMLElement,
): DOMConversionOutput {
  // domNode is a <b> since we matched it by nodeName
  const b = domNode
  // Google Docs wraps all copied HTML in a <b> with font-weight normal
  const hasNormalFontWeight = b.style.fontWeight === 'normal'

  return {
    forChild: applyTextFormatFromStyle(
      b.style,
      hasNormalFontWeight ? undefined : 'bold',
    ),
    node: null,
  }
}

const preParentCache = new WeakMap<Node, null | Node>()

/**
 * 주어진 노드가 PRE 노드인지 확인합니다.
 *
 * @param node - 확인할 노드
 * @returns 노드가 PRE 태그이거나 white-space: pre 스타일을 가지고 있으면 true, 그렇지 않으면 false
 */
function isNodePre(node: Node): boolean {
  return (
    node.nodeName === 'PRE' ||
    (node.nodeType === DOM_ELEMENT_TYPE &&
      (node as HTMLElement).style !== undefined &&
      (node as HTMLElement).style.whiteSpace !== undefined &&
      (node as HTMLElement).style.whiteSpace.startsWith('pre'))
  )
}

/**
 * 주어진 노드의 가장 가까운 PRE 부모 노드를 찾습니다.
 *
 * @param node - 검색을 시작할 노드
 * @returns 가장 가까운 PRE 부모 노드, 없으면 null
 */
export function findParentPreDOMNode(node: Node): Node | null {
  let cached
  let parent = node.parentNode
  const visited = [node]
  while (
    parent !== null &&
    (cached = preParentCache.get(parent)) === undefined &&
    !isNodePre(parent)
  ) {
    visited.push(parent)
    parent = parent.parentNode
  }
  const resultNode = cached === undefined ? parent : cached
  for (let i = 0; i < visited.length; i++) {
    preParentCache.set(visited[i], resultNode)
  }
  return resultNode
}

/**
 * DOM 텍스트 노드를 Lexical 노드로 변환합니다.
 *
 * @param domNode - 변환할 DOM 텍스트 노드
 * @returns DOMConversionOutput - 변환된 Lexical 노드(들)을 포함하는 객체
 *
 * @description
 * 이 함수는 DOM 텍스트 노드를 Lexical 노드로 변환합니다.
 * PRE 태그 내부의 텍스트는 특별히 처리되며, 줄바꿈과 탭이 보존됩니다.
 * 그 외의 경우, 연속된 공백은 단일 공백으로 압축되고,
 * 시작과 끝의 공백은 주변 컨텍스트에 따라 처리됩니다.
 */
function $convertTextDOMNode(domNode: Node): DOMConversionOutput {
  const domNode_ = domNode as Text
  const parentDom = domNode.parentElement
  invariant(parentDom !== null, 'Expected parentElement of Text not to be null')
  let textContent = domNode_.textContent || ''
  // No collapse and preserve segment break for pre, pre-wrap and pre-line
  if (findParentPreDOMNode(domNode_) !== null) {
    const parts = textContent.split(/(\r?\n|\t)/)
    const nodes: Array<LexicalNode> = []
    const length = parts.length
    for (let i = 0; i < length; i++) {
      const part = parts[i]
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode())
      } else if (part === '\t') {
        nodes.push($createTabNode())
      } else if (part !== '') {
        nodes.push($createTextNode(part))
      }
    }
    return { node: nodes }
  }
  textContent = textContent.replace(/\r/g, '').replace(/[ \t\n]+/g, ' ')
  if (textContent === '') {
    return { node: null }
  }
  if (textContent[0] === ' ') {
    // Traverse backward while in the same line. If content contains new line or tab -> pontential
    // delete, other elements can borrow from this one. Deletion depends on whether it's also the
    // last space (see next condition: textContent[textContent.length - 1] === ' '))
    let previousText: null | Text = domNode_
    let isStartOfLine = true
    while (
      previousText !== null &&
      (previousText = findTextInLine(previousText, false)) !== null
    ) {
      const previousTextContent = previousText.textContent || ''
      if (previousTextContent.length > 0) {
        if (/[ \t\n]$/.test(previousTextContent)) {
          textContent = textContent.slice(1)
        }
        isStartOfLine = false
        break
      }
    }
    if (isStartOfLine) {
      textContent = textContent.slice(1)
    }
  }
  if (textContent[textContent.length - 1] === ' ') {
    // Traverse forward while in the same line, preserve if next inline will require a space
    let nextText: null | Text = domNode_
    let isEndOfLine = true
    while (
      nextText !== null &&
      (nextText = findTextInLine(nextText, true)) !== null
    ) {
      const nextTextContent = (nextText.textContent || '').replace(
        /^( |\t|\r?\n)+/,
        '',
      )
      if (nextTextContent.length > 0) {
        isEndOfLine = false
        break
      }
    }
    if (isEndOfLine) {
      textContent = textContent.slice(0, textContent.length - 1)
    }
  }
  if (textContent === '') {
    return { node: null }
  }
  return { node: $createTextNode(textContent) }
}

/**
 * 주어진 텍스트 노드의 동일 라인 내에서 다음/이전 텍스트 노드를 찾습니다.
 *
 * @param text - 시작점이 되는 텍스트 노드
 * @param forward - true면 다음 노드를, false면 이전 노드를 찾습니다
 * @returns 찾은 텍스트 노드 또는 null (라인의 끝에 도달했거나 적절한 노드를 찾지 못한 경우)
 *
 * @description
 * 이 함수는 DOM 트리를 순회하며 같은 라인 내의 다음 또는 이전 텍스트 노드를 찾습니다.
 * 인라인 요소만을 고려하며, 블록 레벨 요소를 만나면 검색을 중단합니다.
 * 'BR' 태그를 만나면 라인의 끝으로 간주하고 null을 반환합니다.
 */
function findTextInLine(text: Text, forward: boolean): null | Text {
  let node: Node = text
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let sibling: null | Node
    while (
      (sibling = forward ? node.nextSibling : node.previousSibling) === null
    ) {
      const parentElement = node.parentElement
      if (parentElement === null) {
        return null
      }
      node = parentElement
    }
    node = sibling
    if (node.nodeType === DOM_ELEMENT_TYPE) {
      const display = (node as HTMLElement).style.display
      if (
        (display === '' && !isInlineDomNode(node)) ||
        (display !== '' && !display.startsWith('inline'))
      ) {
        return null
      }
    }
    let descendant: null | Node = node
    while ((descendant = forward ? node.firstChild : node.lastChild) !== null) {
      node = descendant
    }
    if (node.nodeType === DOM_TEXT_TYPE) {
      return node as Text
    } else if (node.nodeName === 'BR') {
      return null
    }
  }
}

const nodeNameToTextFormat: Record<string, TextFormatType> = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
}

function convertTextFormatElement(domNode: HTMLElement): DOMConversionOutput {
  const format = nodeNameToTextFormat[domNode.nodeName.toLowerCase()]
  if (format === undefined) {
    return { node: null }
  }
  return {
    forChild: applyTextFormatFromStyle(domNode.style, format),
    node: null,
  }
}

export function $createTextNode(text = ''): TextNode {
  return $applyNodeReplacement(new TextNode(text))
}

/**
 * CSS 스타일을 기반으로 텍스트 노드에 형식을 적용하는 함수를 생성합니다.
 *
 * @param style - 적용할 CSS 스타일 선언
 * @param shouldApply - 추가로 적용해야 할 텍스트 형식 타입 (선택적)
 * @returns LexicalNode를 받아 형식이 적용된 LexicalNode를 반환하는 함수
 *
 * @description
 * 이 함수는 주로 Google Docs와 같은 외부 소스에서 복사된 텍스트의
 * 스타일을 Lexical 에디터의 형식으로 변환하는 데 사용됩니다.
 */
function applyTextFormatFromStyle(
  style: CSSStyleDeclaration,
  shouldApply?: TextFormatType,
) {
  // CSS 스타일에서 관련 속성들을 추출합니다.
  const fontWeight = style.fontWeight
  const textDecoration = style.textDecoration.split(' ')
  const hasBoldFontWeight = fontWeight === '700' || fontWeight === 'bold'
  const hasLinethroughTextDecoration = textDecoration.includes('line-through')
  const hasItalicFontStyle = style.fontStyle === 'italic'
  const hasUnderlineTextDecoration = textDecoration.includes('underline')
  const verticalAlign = style.verticalAlign

  // 실제 형식을 적용하는 함수를 반환합니다.
  return (lexicalNode: LexicalNode) => {
    if (!$isTextNode(lexicalNode)) {
      return lexicalNode
    }

    // 각 스타일 속성에 대해 해당하는 Lexical 형식을 적용합니다.
    if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
      lexicalNode.toggleFormat('bold')
    }
    if (
      hasLinethroughTextDecoration &&
      !lexicalNode.hasFormat('strikethrough')
    ) {
      lexicalNode.toggleFormat('strikethrough')
    }
    if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
      lexicalNode.toggleFormat('italic')
    }
    if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
      lexicalNode.toggleFormat('underline')
    }
    if (verticalAlign === 'sub' && !lexicalNode.hasFormat('subscript')) {
      lexicalNode.toggleFormat('subscript')
    }
    if (verticalAlign === 'super' && !lexicalNode.hasFormat('superscript')) {
      lexicalNode.toggleFormat('superscript')
    }

    // 추가로 적용해야 할 형식이 있다면 적용합니다.
    if (shouldApply && !lexicalNode.hasFormat(shouldApply)) {
      lexicalNode.toggleFormat(shouldApply)
    }

    return lexicalNode
  }
}

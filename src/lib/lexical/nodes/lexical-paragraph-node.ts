import { $isTextNode, type TextFormatType } from './lexical-text-node'
import { TEXT_TYPE_TO_FORMAT } from '../lexical-constants'
import type { LexicalEditor } from '../lexical-editor'
import type { EditorConfig } from '../lexical-editor.type'
import type { KlassConstructor, Spread } from '../lexical-type'
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
} from '@/lib/lexical/lexical-node.ts'
import type { SerializedElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import type { ElementFormatType } from 'lexical'
import { isHTMLElement } from 'lexical'

import {
  $applyNodeReplacement,
  getCachedClassNameArray,
} from '@/lib/lexical/lexical-utils.ts'
import { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import { RangeSelection } from '../lexical-selection'

export type SerializedParagraphNode = Spread<
  { textFormat: number; textStyle: string },
  SerializedElementNode
>

/** @noInheritDoc */
export class ParagraphNode extends ElementNode {
  declare ['constructor']: KlassConstructor<typeof ParagraphNode>

  /** @internal */
  __textFormat: number
  /** @internal */
  __textStyle: string

  constructor(key?: NodeKey) {
    super(key)
    this.__textFormat = 0
    this.__textStyle = ''
  }

  static getType(): string {
    return 'paragraph'
  }

  getTextFormat(): number {
    const self = this.getLatest()
    return self.__textFormat
  }

  setTextFormat(type: number): this {
    const self = this.getWritable()
    self.__textFormat = type
    return self
  }

  hasTextFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type]
    return (this.getTextFormat() & formatFlag) !== 0
  }

  getTextStyle(): string {
    const self = this.getLatest()
    return self.__textStyle
  }

  setTextStyle(style: string): this {
    const self = this.getWritable()
    self.__textStyle = style
    return self
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new ParagraphNode(node.__key)
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('p')
    const classNames = getCachedClassNameArray(config.theme, 'paragraph')

    if (classNames !== undefined) {
      const domClassList = dom.classList
      domClassList.add(...classNames)
    }

    return dom
  }
  updateDOM(
    _prevNode: ParagraphNode,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      p: (_node: Node) => ({
        conversion: $convertParagraphElement,
        priority: 0,
      }),
    }
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor)

    if (element && isHTMLElement(element)) {
      if (this.isEmpty()) {
        element.append(document.createElement('br'))
      }

      const formatType = this.getFormatType()
      element.style.textAlign = formatType

      const direction = this.getDirection()
      if (direction) {
        element.dir = direction
      }

      const indent = this.getIndent()
      if (indent > 0) {
        // padding-inline-start is not widely supported in email HTML, but
        // Lexical Reconciler uses padding-inline-start. Using text-indent instead.
        element.style.textIndent = `${indent * 20}px`
      }
    }

    return {
      element,
    }
  }

  static importJSON(serializedNode: SerializedParagraphNode): ParagraphNode {
    const node = $createParagraphNode()
    node.setFormat(serializedNode.format)
    node.setIndent(serializedNode.indent)
    node.setDirection(serializedNode.direction)
    node.setTextFormat(serializedNode.textFormat)
    return node
  }

  exportJSON(): SerializedParagraphNode {
    return {
      ...super.exportJSON(),
      textFormat: this.getTextFormat(),
      textStyle: this.getTextStyle(),
      type: 'paragraph',
      version: 1,
    }
  }

  // Mutation
  /**
   * 현재 요소 다음에 새로운 단락을 삽입하는 메서드
   *
   * @param rangeSelection - 현재 선택 범위
   * @param restoreSelection - 선택 영역 복원 여부
   * @returns 새로 생성된 ParagraphNode
   *
   * @description
   * 이 메서드는 현재 요소 다음에 새로운 단락을 생성하고 삽입합니다.
   * 새 단락은 현재 선택 범위의 서식과 스타일을 상속받습니다.
   */
  insertNewAfter(
    rangeSelection: RangeSelection,
    restoreSelection: boolean,
  ): ParagraphNode {
    const newElement = $createParagraphNode()

    // 현재 선택 범위의 서식과 스타일을 새 노드에 적용
    newElement.setTextFormat(rangeSelection.format)
    newElement.setTextStyle(rangeSelection.style)

    const direction = this.getDirection()
    newElement.setDirection(direction)
    newElement.setFormat(this.getFormatType())
    newElement.setStyle(this.getTextStyle())

    this.insertAfter(newElement, restoreSelection)
    return newElement
  }

  /**
   * 요소의 시작 부분을 축소하는 메서드
   *
   * @returns 축소가 성공적으로 수행되었는지 여부
   *
   * @description
   * 이 메서드는 요소가 비어있거나 첫 번째 자식이 비어있는 텍스트 노드일 경우,
   * 요소를 제거하고 선택 영역을 이동시킵니다.
   */
  collapseAtStart(): boolean {
    const children = this.getChildren()
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    // 요소가 비어있거나 첫 번째 자식이 비어있는 텍스트 노드인지 확인
    if (
      children.length === 0 ||
      ($isTextNode(children[0]) && children[0].getTextContent().trim() === '')
    ) {
      const nextSibling = this.getNextSibling()
      if (nextSibling !== null) {
        this.selectNext()
        this.remove()
        return true
      }
      const prevSibling = this.getPreviousSibling()
      if (prevSibling !== null) {
        this.selectPrevious()
        this.remove()
        return true
      }
    }

    return false
  }
}

function $convertParagraphElement(element: HTMLElement): DOMConversionOutput {
  const node = $createParagraphNode()

  if (element.style) {
    node.setFormat(element.style.textAlign as ElementFormatType)
    const indent = parseInt(element.style.textIndent, 10) / 20

    if (indent > 0) {
      node.setIndent(indent)
    }
  }

  return { node }
}

export function $createParagraphNode(): ParagraphNode {
  return $applyNodeReplacement(new ParagraphNode())
}

export function $isParagraphNode(
  node: LexicalNode | null | undefined,
): node is ParagraphNode {
  return node instanceof ParagraphNode
}

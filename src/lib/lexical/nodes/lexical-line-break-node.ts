import { DOM_TEXT_TYPE } from '../lexical-constants'
import type {
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
} from '../lexical-node'
import { LexicalNode, type SerializedLexicalNode } from '../lexical-node'
import type { KlassConstructor } from '../lexical-type'
import { $applyNodeReplacement, isBlockDomNode } from '../lexical-utils'

export type SerializedLineBreakNode = SerializedLexicalNode

/** @noInheritDoc */
export class LineBreakNode extends LexicalNode {
  declare ['constructor']: KlassConstructor<typeof LineBreakNode>

  static getType(): string {
    return 'linebreak'
  }

  static clone(node: LineBreakNode): LineBreakNode {
    return new LineBreakNode(node.__key)
  }

  constructor(key?: NodeKey) {
    super(key)
  }

  getTextContent(): '\n' {
    return '\n'
  }

  createDOM(): HTMLElement {
    return document.createElement('br')
  }

  updateDOM(): false {
    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      br: (node: Node) => {
        if (isOnlyChildInBlockNode(node) || isLastChildInBlockNode(node)) {
          return null
        }

        return {
          conversion: $convertLineBreakElement,
          priority: 0,
        }
      },
    }
  }

  static importJSON(
    _serializedLineBreakNode: SerializedLineBreakNode,
  ): LineBreakNode {
    return $createLineBreakNode()
  }

  exportJSON(): SerializedLexicalNode {
    return {
      type: 'linebreak',
      version: 1,
    }
  }
}

function $convertLineBreakElement(_node: Node): DOMConversionOutput {
  return { node: $createLineBreakNode() }
}

export function $createLineBreakNode(): LineBreakNode {
  return $applyNodeReplacement(new LineBreakNode())
}

export function $isLineBreakNode(
  node: LexicalNode | null | undefined,
): node is LineBreakNode {
  return node instanceof LineBreakNode
}

/**
 * 주어진 노드가 블록 노드 내의 유일한 자식인지 확인하는 함수
 *
 * @param node - 확인할 DOM 노드
 * @returns 노드가 블록 노드의 유일한 자식이면 true, 아니면 false
 *
 * @description
 * 이 함수는 주어진 노드가 블록 레벨 부모 요소 내에서 유일한 실질적인 자식인지 확인합니다.
 * 주요 동작:
 * 1. 부모 요소가 블록 레벨 요소인지 확인
 * 2. 노드가 첫 번째 자식이거나, 첫 번째 자식 다음에 오는 유의미한 노드인지 확인
 * 3. 노드가 마지막 자식이거나, 마지막 자식 이전에 오는 유의미한 노드인지 확인
 * 4. 위 조건을 모두 만족하면 true 반환, 그렇지 않으면 false 반환
 *
 * 주의: 이 함수는 순수한 공백 텍스트 노드는 무시합니다.
 */
function isOnlyChildInBlockNode(node: Node): boolean {
  const parentElement = node.parentElement
  if (parentElement !== null && isBlockDomNode(parentElement)) {
    const firstChild = parentElement.firstChild!
    if (
      firstChild === node ||
      (firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild))
    ) {
      const lastChild = parentElement.lastChild!
      if (
        lastChild === node ||
        (lastChild.previousSibling === node &&
          isWhitespaceDomTextNode(lastChild))
      ) {
        return true
      }
    }
  }
  return false
}
/**
 * 주어진 노드가 블록 노드 내의 마지막 자식인지 확인하는 함수
 *
 * @param node - 확인할 DOM 노드
 * @returns 노드가 블록 노드의 마지막 자식이면 true, 아니면 false
 *
 * @description
 * 이 함수는 주어진 노드가 블록 레벨 부모 요소 내에서 마지막 실질적인 자식인지 확인합니다.
 * 주요 동작:
 * 1. 부모 요소가 블록 레벨 요소인지 확인
 * 2. 노드가 첫 번째 자식이 아닌지 확인 (유일한 자식은 마지막 자식으로 간주하지 않음)
 * 3. 노드가 마지막 자식이거나, 마지막 자식 이전에 오는 유의미한 노드인지 확인
 * 4. 위 조건을 모두 만족하면 true 반환, 그렇지 않으면 false 반환
 *
 * 주의: 이 함수는 순수한 공백 텍스트 노드는 무시합니다.
 */
function isLastChildInBlockNode(node: Node): boolean {
  const parentElement = node.parentElement
  if (parentElement !== null && isBlockDomNode(parentElement)) {
    // check if node is first child, because only childs dont count
    const firstChild = parentElement.firstChild!
    if (
      firstChild === node ||
      (firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild))
    ) {
      return false
    }

    // check if its last child
    const lastChild = parentElement.lastChild!
    if (
      lastChild === node ||
      (lastChild.previousSibling === node && isWhitespaceDomTextNode(lastChild))
    ) {
      return true
    }
  }
  return false
}
/**
 * 주어진 노드가 공백 텍스트 노드인지 확인하는 함수
 *
 * @param node - 확인할 DOM 노드
 * @returns 노드가 공백 텍스트 노드이면 true, 아니면 false
 *
 * @description
 * 이 함수는 주어진 노드가 순수한 공백 텍스트 노드인지 확인합니다.
 * 주요 동작:
 * 1. 노드가 텍스트 노드 타입인지 확인
 * 2. 노드의 텍스트 내용이 공백, 탭, 또는 줄바꿈 문자로만 구성되어 있는지 확인
 */
function isWhitespaceDomTextNode(node: Node): boolean {
  return (
    node.nodeType === DOM_TEXT_TYPE &&
    /^( |\t|\r?\n)+$/.test(node.textContent || '')
  )
}

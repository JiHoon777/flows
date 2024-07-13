import { IS_CHROME } from '@lexical/utils'
import {
  $createParagraphNode,
  $isElementNode,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
} from 'lexical'

import { $isCollapsibleContainerNode } from '@/components/lexical/nodes/collapsible/collapsible-container.node.ts'
import { $isCollapsibleContentNode } from '@/components/lexical/nodes/collapsible/collapsible-content-node.ts'
import invariant from '@/components/lexical/utils/invariant.ts'

type SerializedCollapsibleTitleNode = SerializedElementNode

export function $convertSummaryElement(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _domNode: HTMLElement,
): DOMConversionOutput | null {
  const node = $createCollapsibleTitleNode()
  return {
    node,
  }
}

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return 'collapsible-title'
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key)
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('summary')
    dom.classList.add('Collapsible__title')
    if (IS_CHROME) {
      dom.addEventListener('click', () => {
        editor.update(() => {
          const collapsibleContainer = this.getLatest().getParentOrThrow()
          invariant(
            $isCollapsibleContainerNode(collapsibleContainer),
            'Expected parent node to be a CollapsibleContainerNode',
          )
          collapsibleContainer.toggleOpen()
        })
      })
    }
    return dom
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateDOM(_prevNode: CollapsibleTitleNode, _dom: HTMLElement): boolean {
    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      summary: (_domNode: HTMLElement) => {
        return {
          conversion: $convertSummaryElement,
          priority: 1,
        }
      },
    }
  }

  static importJSON(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _serializedNode: SerializedCollapsibleTitleNode,
  ): CollapsibleTitleNode {
    return $createCollapsibleTitleNode()
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  collapseAtStart(_selection: RangeSelection): boolean {
    this.getParentOrThrow().insertBefore(this)
    return true
  }

  insertNewAfter(_: RangeSelection, restoreSelection = true): ElementNode {
    const containerNode = this.getParentOrThrow()

    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error(
        'CollapsibleTitleNode expects to be child of CollapsibleContainerNode',
      )
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling()
      if (!$isCollapsibleContentNode(contentNode)) {
        throw new Error(
          'CollapsibleTitleNode expects to have CollapsibleContentNode sibling',
        )
      }

      const firstChild = contentNode.getFirstChild()
      if ($isElementNode(firstChild)) {
        return firstChild
      } else {
        const paragraph = $createParagraphNode()
        contentNode.append(paragraph)
        return paragraph
      }
    } else {
      const paragraph = $createParagraphNode()
      containerNode.insertAfter(paragraph, restoreSelection)
      return paragraph
    }
  }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode()
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode
}

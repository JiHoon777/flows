import type {
  DOMConversionMap,
  LexicalNode,
  NodeKey,
} from '@/lib/lexical/lexical-node.ts'
import type {
  SerializedTextNode,
  TextDetailType,
  TextModeType,
} from '@/lib/lexical/nodes/lexical-text-node.type.ts'

import { IS_UNMERGEABLE } from '@/lib/lexical/lexical-constants.ts'
import { $applyNodeReplacement } from '@/lib/lexical/lexical-utils.ts'
import { TextNode } from '@/lib/lexical/nodes/lexical-text-node.ts'
import invariant from '@/utils/invariant'

export type SerializedTabNode = SerializedTextNode

/** @noInheritDoc */
export class TabNode extends TextNode {
  static getType(): string {
    return 'tab'
  }

  static clone(node: TabNode): TabNode {
    const newNode = new TabNode(node.__key)
    // TabNode __text can be either '\t' or ''. insertText will remove the empty Node
    newNode.__text = node.__text
    newNode.__format = node.__format
    newNode.__style = node.__style
    return newNode
  }

  constructor(key?: NodeKey) {
    super('\t', key)
    this.__detail = IS_UNMERGEABLE
  }

  static importDOM(): DOMConversionMap | null {
    return null
  }

  static importJSON(serializedTabNode: SerializedTabNode): TabNode {
    const node = $createTabNode()
    node.setFormat(serializedTabNode.format)
    node.setStyle(serializedTabNode.style)
    return node
  }

  exportJSON(): SerializedTabNode {
    return {
      ...super.exportJSON(),
      type: 'tab',
      version: 1,
    }
  }

  setTextContent(_text: string): this {
    invariant(false, 'TabNode does not support setTextContent')
  }

  setDetail(_detail: TextDetailType | number): this {
    invariant(false, 'TabNode does not support setDetail')
  }

  setMode(_type: TextModeType): this {
    invariant(false, 'TabNode does not support setMode')
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }
}

export function $createTabNode(): TabNode {
  return $applyNodeReplacement(new TabNode())
}

export function $isTabNode(
  node: LexicalNode | null | undefined,
): node is TabNode {
  return node instanceof TabNode
}

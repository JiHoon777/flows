import { TextNode } from './lexical-text-node'
import { IS_UNMERGEABLE } from '../lexical-constants'
import type { LexicalNode, NodeKey } from '../lexical-node'
import { $applyNodeReplacement } from '../lexical-utils'

export class TabNode extends TextNode {
  constructor(key?: NodeKey) {
    super('\t', key)
    this.__detail = IS_UNMERGEABLE
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

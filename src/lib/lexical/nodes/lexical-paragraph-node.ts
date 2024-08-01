import type { LexicalNode } from '@/lib/lexical/lexical-node.ts'
import { $applyNodeReplacement } from '@/lib/lexical/lexical-utils.ts'
import { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

export class ParagraphNode extends ElementNode {}

export function $createParagraphNode(): ParagraphNode {
  return $applyNodeReplacement(new ParagraphNode())
}

export function $isParagraphNode(node: LexicalNode | null | undefined) {
  return node instanceof ParagraphNode
}

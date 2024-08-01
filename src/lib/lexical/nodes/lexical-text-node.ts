import { LexicalNode } from '@/lib/lexical/lexical-node.ts'
import {
  $getSelection,
  RangeSelection,
} from '@/lib/lexical/lexical-selection.ts'
import { errorOnReadOnly } from '@/lib/lexical/lexical-updates.ts'

export class TextNode extends LexicalNode {
  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
    errorOnReadOnly()
    return $getSelection() as unknown as RangeSelection
  }
}

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'highlight'
  | 'code'
  | 'subscript'
  | 'superscript'

export type TextDetailType = 'directionless' | 'unmergable'

export type TextModeType = 'normal' | 'token' | 'segmented'

export function $isTextNode(node: LexicalNode | null | undefined) {
  return node instanceof TextNode
}

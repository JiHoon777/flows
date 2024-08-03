import type { SerializedLexicalNode } from '../lexical-node'
import type { Spread } from '../lexical-type'

export type SerializedTextNode = Spread<
  {
    detail: number
    format: number
    mode: TextModeType
    style: string
    text: string
  },
  SerializedLexicalNode
>

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

export type TextMark = { end: null | number; id: string; start: null | number }

export type TextMarks = Array<TextMark>

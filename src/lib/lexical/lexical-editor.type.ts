import type { LexicalEditor } from './lexical-editor'
import type {
  DOMExportOutput,
  LexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type { Klass } from '@/lib/lexical/lexical-type.ts'

export type Transform<T extends LexicalNode> = (node: T) => void
export type RegisteredNode = {
  klass: Klass<LexicalNode>
  transforms: Set<Transform<LexicalNode>>
  replace: null | ((node: LexicalNode) => LexicalNode)
  replaceWithKlass: null | Klass<LexicalNode>
  exportDOM?: (
    editor: LexicalEditor,
    targetNode: LexicalNode,
  ) => DOMExportOutput
}
export type RegisteredNodes = Map<string, RegisteredNode>
/**
 * false , 해당 노드가 간접적으로 dirty 되었음을 의미,
 * - 노드 자체는 변경되지 않았지만, 그 자식 노드 중 하나가 변경되어, 부모도 업데이트가 필요할 수 있음을 의미
 * true , 해당 노드가 직접적으로 dirty 되었음을 의미
 */

export type IntentionallyMarkedAsDirtyElement = boolean

export type EditorThemeClassName = string

export type TextNodeThemeClasses = {
  base?: EditorThemeClassName
  bold?: EditorThemeClassName
  code?: EditorThemeClassName
  highlight?: EditorThemeClassName
  italic?: EditorThemeClassName
  strikethrough?: EditorThemeClassName
  subscript?: EditorThemeClassName
  superscript?: EditorThemeClassName
  underline?: EditorThemeClassName
  underlineStrikethrough?: EditorThemeClassName
  [key: string]: EditorThemeClassName | undefined
}

export type EditorThemeClasses = {
  root?: EditorThemeClassName
  paragraph?: EditorThemeClassName
  text?: TextNodeThemeClasses
  [key: string]: any
}

export type EditorConfig = {
  disableEvents?: boolean
  namespace: string
  theme: EditorThemeClasses
}

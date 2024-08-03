import type { SerializedRootNode } from './nodes/lexical-root-node'
import type {
  NodeMap,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import type { BaseSelection } from '@/lib/lexical/lexical-selection.ts'

export interface SerializedEditorState<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> {
  root: SerializedRootNode<T>
}
export class EditorState {
  _nodeMap: NodeMap
  _selection: null | BaseSelection
  _flushSync: boolean
  _readOnly: boolean

  constructor(nodeMap: NodeMap) {
    this._nodeMap = nodeMap
    this._selection = null
    this._flushSync = false
    this._readOnly = false
  }
}

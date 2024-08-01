import { NodeMap } from '@/lib/lexical/lexical-node.ts'
import { BaseSelection } from '@/lib/lexical/lexical-selection.ts'

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

import type {
  RegisteredNodes,
  IntentionallyMarkedAsDirtyElement,
  EditorConfig,
} from './lexical-editor.type'
import type { NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { KlassConstructor } from '@/lib/lexical/lexical-type.ts'

export class LexicalEditor {
  ['constructor']!: KlassConstructor<typeof LexicalEditor>

  /** @internal */
  _compositionKey: null | NodeKey
  /** @internal */
  _nodes: RegisteredNodes
  /** @internal */
  _dirtyType: 0 | 1 | 2
  /** @internal */
  _cloneNotNeeded: Set<NodeKey>
  /** @internal */
  _dirtyLeaves: Set<NodeKey>
  /** @internal */
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>
  /** @internal */
  _config: EditorConfig
}

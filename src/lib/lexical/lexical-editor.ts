import type {
  RegisteredNodes,
  IntentionallyMarkedAsDirtyElement,
  EditorConfig,
} from './lexical-editor.type'
import type { NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { KlassConstructor } from '@/lib/lexical/lexical-type.ts'

const DEFAULT_SKIP_INITIALIZATION = true

export const COMMAND_PRIORITY_EDITOR = 0
export const COMMAND_PRIORITY_LOW = 1
export const COMMAND_PRIORITY_NORMAL = 2
export const COMMAND_PRIORITY_HIGH = 3
export const COMMAND_PRIORITY_CRITICAL = 4

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

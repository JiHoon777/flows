import type { LexicalCommand } from '@/lib/lexical/lexical-commands.ts'
import type { LexicalEditor } from '@/lib/lexical/lexical-editor'
import type {
  EditorState,
  SerializedEditorState,
} from '@/lib/lexical/lexical-editor-state'
import type {
  DOMConversion,
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
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
  __lexicalClassNameCache?: {
    [key: string]: string[]
  }
}

export type TextNodeThemeClassesKeys = keyof TextNodeThemeClasses

export type EditorThemeClasses = {
  blockCursor?: EditorThemeClassName
  root?: EditorThemeClassName
  paragraph?: EditorThemeClassName
  indent?: EditorThemeClassName
  ltr?: EditorThemeClassName
  rtl?: EditorThemeClassName

  text?: TextNodeThemeClasses
  __lexicalClassNameCache?: {
    [key: string]: string[]
  }
}

export type EditorThemeClassesKeys = keyof EditorThemeClasses

export type EditorConfig = {
  disableEvents?: boolean
  namespace: string
  theme: EditorThemeClasses
}

export type EditorUpdateOptions = {
  onUpdate?: () => void
  skipTransforms?: true
  tag?: string
  discrete?: true
}

export type EditorSetOptions = {
  tag?: string
}

export type EditorFocusOptions = {
  defaultSelection?: 'rootStart' | 'rootEnd'
}

export type LexicalNodeReplacement = {
  replace: Klass<LexicalNode>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  with: <T extends { new (...args: any): any }>(
    node: InstanceType<T>,
  ) => LexicalNode
  withKlass?: Klass<LexicalNode>
}

export type HTMLConfig = {
  export?: Map<
    Klass<LexicalNode>,
    (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
  >
  import?: DOMConversionMap
}

export type CreateEditorArgs = {
  disableEvents?: boolean
  editorState?: EditorState
  namespace?: string
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
  onError?: ErrorHandler
  parentEditor?: LexicalEditor
  editable?: boolean
  theme?: EditorThemeClasses
  html?: HTMLConfig
}

export type ErrorHandler = (error: Error) => void

export type MutationListeners = Map<MutationListener, Klass<LexicalNode>>

export type MutatedNodes = Map<Klass<LexicalNode>, Map<NodeKey, NodeMutation>>

export type NodeMutation = 'created' | 'updated' | 'destroyed'

export interface MutationListenerOptions {
  /**
   * Skip the initial call of the listener with pre-existing DOM nodes.
   *
   * The default is currently true for backwards compatibility with <= 0.16.1
   * but this default is expected to change to false in 0.17.0.
   */
  skipInitialization?: boolean
}

export type UpdateListener = (arg0: {
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>
  dirtyLeaves: Set<NodeKey>
  editorState: EditorState
  normalizedNodes: Set<NodeKey>
  prevEditorState: EditorState
  tags: Set<string>
}) => void

export type DecoratorListener<T = never> = (
  decorator: Record<NodeKey, T>,
) => void

export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement,
) => void

export type TextContentListener = (text: string) => void

export type MutationListener = (
  nodes: Map<NodeKey, NodeMutation>,
  payload: {
    updateTags: Set<string>
    dirtyLeaves: Set<string>
    prevEditorState: EditorState
  },
) => void

export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean

export type EditableListener = (editable: boolean) => void

export type CommandListenerPriority = 0 | 1 | 2 | 3 | 4

/**
 * Type helper for extracting the payload type from a command.
 *
 * @example
 * ```ts
 * const MY_COMMAND = createCommand<SomeType>();
 *
 * // ...
 *
 * editor.registerCommand(MY_COMMAND, payload => {
 *   // Type of `payload` is inferred here. But lets say we want to extract a function to delegate to
 *   handleMyCommand(editor, payload);
 *   return true;
 * });
 *
 * function handleMyCommand(editor: LexicalEditor, payload: CommandPayloadType<typeof MY_COMMAND>) {
 *   // `payload` is of type `SomeType`, extracted from the command.
 * }
 * ```
 */
export type CommandPayloadType<TCommand extends LexicalCommand<unknown>> =
  TCommand extends LexicalCommand<infer TPayload> ? TPayload : never

export type Commands = Map<
  LexicalCommand<unknown>,
  Array<Set<CommandListener<unknown>>>
>
export type Listeners = {
  decorator: Set<DecoratorListener>
  mutation: MutationListeners
  editable: Set<EditableListener>
  root: Set<RootListener>
  textcontent: Set<TextContentListener>
  update: Set<UpdateListener>
}

export type Listener =
  | DecoratorListener
  | EditableListener
  | MutationListener
  | RootListener
  | TextContentListener
  | UpdateListener

export type ListenerType =
  | 'update'
  | 'root'
  | 'decorator'
  | 'textcontent'
  | 'mutation'
  | 'editable'

export type TransformerType = 'text' | 'decorator' | 'element' | 'root'

export type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>
>

export type SerializedEditor = {
  editorState: SerializedEditorState
}

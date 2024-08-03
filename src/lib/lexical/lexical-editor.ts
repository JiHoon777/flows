import type { LexicalCommand } from '@/lib/lexical/lexical-commands.ts'
import type {
  EditorState,
  SerializedEditorState,
} from '@/lib/lexical/lexical-editor-state'
import type {
  CommandListener,
  CommandListenerPriority,
  CommandPayloadType,
  Commands,
  DecoratorListener,
  DOMConversionCache,
  EditableListener,
  EditorConfig,
  EditorFocusOptions,
  EditorSetOptions,
  EditorUpdateOptions,
  ErrorHandler,
  IntentionallyMarkedAsDirtyElement,
  Listeners,
  MutationListener,
  MutationListenerOptions,
  NodeMutation,
  RegisteredNode,
  RegisteredNodes,
  RootListener,
  SerializedEditor,
  TextContentListener,
  Transform,
  UpdateListener,
} from '@/lib/lexical/lexical-editor.type'
import type { LexicalNode, NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { Klass, KlassConstructor } from '@/lib/lexical/lexical-type.ts'
import { nanoid } from 'nanoid'

import { FULL_RECONCILE, NO_DIRTY_NODES } from '@/lib/lexical/lexical-constants'
import { createEmptyEditorState } from '@/lib/lexical/lexical-editor-state'
import {
  addRootElementEvents,
  removeRootElementEvents,
} from '@/lib/lexical/lexical-events.ts'
import {
  $flushRootMutations,
  initMutationObserver,
} from '@/lib/lexical/lexical-mutations.ts'
import { $getSelection } from '@/lib/lexical/lexical-selection.ts'
import {
  $commitPendingUpdates,
  parseEditorState,
  triggerListeners,
  updateEditor,
} from '@/lib/lexical/lexical-updates.ts'
import {
  $getRoot,
  dispatchCommand,
  getCachedClassNameArray,
  getCachedTypeToNodeMap,
  getDefaultView,
  getDOMSelection,
  markAllNodesAsDirty,
} from '@/lib/lexical/lexical-utils.ts'
import invariant from '@/utils/invariant.ts'

const DEFAULT_SKIP_INITIALIZATION = true

export const COMMAND_PRIORITY_EDITOR = 0
export const COMMAND_PRIORITY_LOW = 1
export const COMMAND_PRIORITY_NORMAL = 2
export const COMMAND_PRIORITY_HIGH = 3
export const COMMAND_PRIORITY_CRITICAL = 4

/**
 * Lexical 에디터의 핵심 클래스입니다.
 *
 * @description
 * LexicalEditor 클래스는 Lexical 에디터의 상태, 구성, 업데이트 메커니즘을 관리합니다.
 * 이 클래스는 에디터의 전반적인 동작을 제어하고, DOM과의 상호작용, 노드 관리,
 * 이벤트 처리 등 에디터의 핵심 기능을 구현합니다.
 *
 */
export class LexicalEditor {
  ['constructor']!: KlassConstructor<typeof LexicalEditor>

  /** @internal 헤드리스 모드 여부 */
  _headless: boolean
  /** @internal 부모 에디터 (중첩 에디터의 경우) */
  _parentEditor: null | LexicalEditor
  /** @internal 에디터의 루트 DOM 요소 */
  _rootElement: null | HTMLElement
  /** @internal 현재 에디터 상태 */
  _editorState: EditorState
  /** @internal 대기 중인 에디터 상태 */
  _pendingEditorState: null | EditorState
  /** @internal 현재 컴포지션 키 */
  _compositionKey: null | NodeKey
  /** @internal 지연된 작업 배열 */
  _deferred: Array<() => void>
  /** @internal 노드 키와 DOM 요소 간의 매핑 */
  _keyToDOMMap: Map<NodeKey, HTMLElement>
  /** @internal 대기 중인 업데이트 배열 */
  _updates: Array<[() => void, EditorUpdateOptions | undefined]>
  /** @internal 업데이트 진행 중 여부 */
  _updating: boolean
  /** @internal 다양한 이벤트 리스너 */
  _listeners: Listeners
  /** @internal 등록된 커맨드 */
  _commands: Commands
  /** @internal 등록된 노드 타입 */
  _nodes: RegisteredNodes
  /** @internal 현재 데코레이터 */
  _decorators: Record<NodeKey, unknown>
  /** @internal 대기 중인 데코레이터 */
  _pendingDecorators: null | Record<NodeKey, unknown>
  /** @internal 에디터 설정 */
  _config: EditorConfig
  /** @internal 더티 노드 타입 */
  _dirtyType: 0 | 1 | 2
  /** @internal 클론이 필요하지 않은 노드 집합 */
  _cloneNotNeeded: Set<NodeKey>
  /** @internal 더티 리프 노드 집합 */
  _dirtyLeaves: Set<NodeKey>
  /** @internal 더티 요소 노드 맵 */
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>
  /** @internal 정규화된 노드 집합 */
  _normalizedNodes: Set<NodeKey>
  /** @internal 업데이트 태그 집합 */
  _updateTags: Set<string>
  /** @internal DOM 변경 감지를 위한 MutationObserver */
  _observer: null | MutationObserver
  /** @internal 에디터 고유 키 */
  _key: string
  /** @internal 에러 핸들러 */
  _onError: ErrorHandler
  /** @internal HTML 변환 캐시 */
  _htmlConversions: DOMConversionCache
  /** @internal 연결된 Window 객체 */
  _window: null | Window
  /** @internal 편집 가능 여부 */
  _editable: boolean
  /** @internal 블록 커서 요소 */
  _blockCursorElement: null | HTMLDivElement

  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
    editable: boolean,
  ) {
    this._parentEditor = parentEditor
    // The root element associated with this editor
    this._rootElement = null
    // The current editor state
    this._editorState = editorState
    // Handling of drafts and updates
    this._pendingEditorState = null
    // Used to help co-ordinate selection and events
    this._compositionKey = null
    this._deferred = []
    // Used during reconciliation
    this._keyToDOMMap = new Map()
    this._updates = []
    this._updating = false
    // Listeners
    this._listeners = {
      decorator: new Set(),
      editable: new Set(),
      mutation: new Map(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set(),
    }
    // Commands
    this._commands = new Map()
    // Editor configuration for theme/context.
    this._config = config
    // Mapping of types to their nodes
    this._nodes = nodes
    // React node decorators for portals
    this._decorators = {}
    this._pendingDecorators = null
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES
    this._cloneNotNeeded = new Set()
    this._dirtyLeaves = new Set()
    this._dirtyElements = new Map()
    this._normalizedNodes = new Set()
    this._updateTags = new Set()
    // Handling of DOM mutations
    this._observer = null
    // Used for identifying owning editors
    this._key = nanoid()

    this._onError = onError
    this._htmlConversions = htmlConversions
    this._editable = editable
    this._headless = parentEditor !== null && parentEditor._headless
    this._window = null
    this._blockCursorElement = null
  }

  /**
   * 에디터가 현재 "composition" 모드인지 확인합니다.
   *
   * @returns {boolean} 에디터가 composition 모드이면 true, 그렇지 않으면 false
   *
   * @description
   * 이 메서드는 에디터가 현재 입력 조합(composition) 상태인지를 확인합니다.
   * 주로 IME(Input Method Editor)나 서드파티 확장을 통한 입력 처리 중일 때
   * true 를 반환합니다. 이는 특히 아시아 언어 등의 복잡한 문자 입력 시 유용합니다.
   *
   * "Composition" 모드는 다음과 같은 상황에서 활성화될 수 있습니다:
   * - 한글, 일본어, 중국어 등의 IME 를 사용한 입력
   * - 음성 입력 도구 사용
   * - 특정 입력 보조 확장 프로그램 사용
   *
   * 이 상태 확인은 텍스트 편집 로직에서 중요할 수 있으며,
   * 입력 처리나 선택 영역 조작 시 특별한 고려가 필요할 수 있습니다.
   *
   */
  isComposing(): boolean {
    return this._compositionKey != null
  }
  /**
   * 에디터 업데이트 이벤트에 대한 리스너를 등록합니다.
   * 이 함수는 에디터가 업데이트될 때마다 ( {@link LexicalEditor.update}를 통해) 제공된 콜백을 실행하며,
   * 해제 함수가 호출될 때까지 계속 실행됩니다.
   *
   * @param listener - 업데이트 이벤트가 발생할 때마다 실행될 콜백 함수입니다.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerUpdateListener(listener: UpdateListener): () => void {
    const listenerSetOrMap = this._listeners.update
    listenerSetOrMap.add(listener)
    return () => {
      listenerSetOrMap.delete(listener)
    }
  }
  /**
   * 에디터가 편집 가능 상태와 편집 불가능 상태 사이를 전환할 때 리스너를 등록합니다.
   * 에디터가 이러한 상태 사이를 전환할 때마다 제공된 콜백을 실행하며,
   * 해제 함수가 호출될 때까지 계속 실행됩니다.
   *
   * @param listener - 상태 전환 시 실행될 콜백 함수입니다.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerEditableListener(listener: EditableListener): () => void {
    const listenerSetOrMap = this._listeners.editable
    listenerSetOrMap.add(listener)
    return () => {
      listenerSetOrMap.delete(listener)
    }
  }
  /**
   * 에디터의 데코레이터 객체가 변경될 때 리스너를 등록합니다.
   * 데코레이터 객체는 모든 DecoratorNode 키와 그에 해당하는 장식된 값을 포함합니다.
   * 이는 주로 외부 UI 프레임워크와 함께 사용됩니다.
   *
   * 에디터가 이러한 상태 사이를 전환할 때마다 제공된 콜백을 실행하며,
   * 해제 함수가 호출될 때까지 계속 실행됩니다.
   *
   * @param listener - 상태 전환 시 실행될 콜백 함수입니다.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */

  registerDecoratorListener<T>(listener: DecoratorListener<T>): () => void {
    const listenerSetOrMap = this._listeners.decorator
    listenerSetOrMap.add(listener)
    return () => {
      listenerSetOrMap.delete(listener)
    }
  }
  /**
   * Lexical 이 DOM 에 업데이트를 커밋하고 에디터의 텍스트 내용이 이전 상태와 변경될 때 리스너를 등록합니다.
   * 만약 업데이트 간 텍스트 내용이 동일하다면, 리스너에게 알림이 발생하지 않습니다.
   *
   * 에디터가 이러한 상태 사이를 전환할 때마다 제공된 콜백을 실행하며,
   * 해제 함수가 호출될 때까지 계속 실행됩니다.
   *
   * @param listener - 상태 전환 시 실행될 콜백 함수입니다.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerTextContentListener(listener: TextContentListener): () => void {
    const listenerSetOrMap = this._listeners.textcontent
    listenerSetOrMap.add(listener)
    return () => {
      listenerSetOrMap.delete(listener)
    }
  }
  /**
   * 에디터의 루트 DOM 요소(편집 가능한 Lexical 이 연결되는 요소)가 변경될 때 리스너를 등록합니다.
   * 이는 주로 루트 요소에 이벤트 리스너를 연결하기 위해 사용됩니다.
   * 루트 리스너 함수는 등록 시 즉시 실행되며 이후 모든 업데이트 시에도 실행됩니다.
   *
   * 에디터가 이러한 상태 사이를 전환할 때마다 제공된 콜백을 실행하며,
   * 해제 함수가 호출될 때까지 계속 실행됩니다.
   *
   * @param listener - 상태 전환 시 실행될 콜백 함수입니다.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerRootListener(listener: RootListener): () => void {
    const listenerSetOrMap = this._listeners.root
    listener(this._rootElement, null)
    listenerSetOrMap.add(listener)
    return () => {
      listener(null, this._rootElement)
      listenerSetOrMap.delete(listener)
    }
  }
  /**
   * 제공된 명령이 디스패치될 때마다 트리거되는 리스너를 등록합니다.
   * 우선순위에 따라 실행됩니다. 더 높은 우선순위에서 실행되는 리스너는 명령을 "가로채고"
   * true 를 반환함으로써 다른 핸들러로 전파되는 것을 방지할 수 있습니다.
   *
   * 동일한 우선순위 레벨에서 등록된 리스너는 등록 순서대로 결정적으로 실행됩니다.
   *
   * @param command - 콜백을 트리거할 명령입니다.
   * @param listener - 명령이 디스패치될 때 실행될 함수입니다.
   * @param priority - 리스너의 상대적 우선순위입니다. 0 | 1 | 2 | 3 | 4
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerCommand<P>(
    command: LexicalCommand<P>,
    listener: CommandListener<P>,
    priority: CommandListenerPriority,
  ): () => void {
    if (priority === undefined) {
      invariant(false, 'Listener for type "command" requires a "priority".')
    }

    const commandsMap = this._commands

    if (!commandsMap.has(command)) {
      commandsMap.set(command, [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
        new Set(),
      ])
    }

    const listenersInPriorityOrder = commandsMap.get(command)

    if (listenersInPriorityOrder === undefined) {
      invariant(
        false,
        'registerCommand: Command %s not found in command map',
        String(command),
      )
    }

    const listeners = listenersInPriorityOrder[priority]
    listeners.add(listener as CommandListener<unknown>)
    return () => {
      listeners.delete(listener as CommandListener<unknown>)

      if (
        listenersInPriorityOrder.every(
          (listenersSet) => listenersSet.size === 0,
        )
      ) {
        commandsMap.delete(command)
      }
    }
  }
  /**
   * 주어진 클래스의 Lexical 노드가 변경될 때 실행되는 리스너를 등록합니다.
   * 리스너는 생성, 삭제, 업데이트된 각 노드에 대한 변경 유형과 함께 노드 목록을 받습니다.
   *
   * 이 기능의 일반적인 사용 사례 중 하나는 Lexical 노드가 생성될 때 기본 DOM 노드에 DOM 이벤트 리스너를 첨부하는 것입니다.
   * 이를 위해 {@link LexicalEditor.getElementByKey}를 사용할 수 있습니다.
   *
   * 기존 노드가 DOM 에 존재하고 skipInitialization 이 true 가 아니면, 리스너는 모든 노드에 'created' NodeMutation 이 있는
   * 'registerMutationListener' 의 updateTag 와 함께 즉시 호출됩니다. 이는 skipInitialization 옵션을 사용하여 제어할 수 있습니다
   * (현재 기본값은 0.16.x의 이전 호환성을 위해 true 이지만 0.17.0에서는 false로 변경될 예정입니다).
   *
   * @param klass - 변경 사항을 듣고 싶은 노드의 클래스입니다.
   * @param listener - 노드가 변경될 때 실행할 로직입니다.
   * @param options - {@link MutationListenerOptions}를 참조하십시오.
   * @returns 등록된 리스너를 제거하는 해제 함수입니다.
   */
  registerMutationListener(
    klass: Klass<LexicalNode>,
    listener: MutationListener,
    options?: MutationListenerOptions,
  ): () => void {
    const klassToMutate = this.resolveRegisteredNodeAfterReplacements(
      this.getRegisteredNode(klass),
    ).klass
    const mutations = this._listeners.mutation
    mutations.set(listener, klassToMutate)
    const skipInitialization = options && options.skipInitialization
    if (
      !(skipInitialization === undefined
        ? DEFAULT_SKIP_INITIALIZATION
        : skipInitialization)
    ) {
      this.initializeMutationListener(listener, klassToMutate)
    }

    return () => {
      mutations.delete(listener)
    }
  }
  /**
   * @internal
   *
   * 주어진 클래스의 타입에 해당하는 등록된 노드를 반환합니다.
   * 등록된 노드가 없으면 오류를 발생시킵니다.
   *
   * @param klass - 타입 정보를 가져올 클래스입니다.
   * @returns 등록된 노드를 반환합니다.
   * @throws - 등록된 노드가 없는 경우 오류를 발생시킵니다.
   */
  private getRegisteredNode(klass: Klass<LexicalNode>): RegisteredNode {
    const registeredNode = this._nodes.get(klass.getType())

    if (registeredNode === undefined) {
      invariant(
        false,
        'Node %s has not been registered. Ensure node has been passed to createEditor.',
        klass.name,
      )
    }

    return registeredNode
  }
  /**
   * @internal
   *
   * 대체된 후의 등록된 노드를 반환합니다.
   * 주어진 등록된 노드가 다른 클래스로 대체될 경우 최종 대체된 노드를 반환합니다.
   *
   * @param registeredNode - 대체될 수 있는 등록된 노드입니다.
   * @returns 최종 대체된 등록된 노드를 반환합니다.
   */
  private resolveRegisteredNodeAfterReplacements(
    registeredNode: RegisteredNode,
  ): RegisteredNode {
    while (registeredNode.replaceWithKlass) {
      registeredNode = this.getRegisteredNode(registeredNode.replaceWithKlass)
    }
    return registeredNode
  }
  /**
   * @internal
   *
   * Mutation 리스너를 초기화합니다.
   * 주어진 클래스 타입의 노드가 생성될 때 'created'로 설정된 변이 맵을 리스너에 전달합니다.
   *
   * @param listener - 변이 리스너입니다.
   * @param klass - 변이를 감지할 노드의 클래스입니다.
   */
  private initializeMutationListener(
    listener: MutationListener,
    klass: Klass<LexicalNode>,
  ): void {
    const prevEditorState = this._editorState
    const nodeMap = getCachedTypeToNodeMap(prevEditorState).get(klass.getType())
    if (!nodeMap) {
      return
    }
    const nodeMutationMap = new Map<string, NodeMutation>()
    for (const k of nodeMap.keys()) {
      nodeMutationMap.set(k, 'created')
    }
    if (nodeMutationMap.size > 0) {
      listener(nodeMutationMap, {
        dirtyLeaves: new Set(),
        prevEditorState,
        updateTags: new Set(['registerMutationListener']),
      })
    }
  }
  /**
   * 주어진 클래스 타입의 노드에 대한 변환 리스너를 등록합니다.
   *
   * @param klass - 변환을 등록할 노드의 클래스입니다.
   * @param listener - 노드 변환 리스너입니다.
   * @returns 등록된 노드를 반환합니다.
   * @internal
   */
  private registerNodeTransformToKlass<T extends LexicalNode>(
    klass: Klass<T>,
    listener: Transform<T>,
  ): RegisteredNode {
    const registeredNode = this.getRegisteredNode(klass)
    registeredNode.transforms.add(listener as Transform<LexicalNode>)

    return registeredNode
  }
  /**
   * 제공된 클래스의 Lexical 노드가 업데이트 중에 더티 마크될 때 실행되는 리스너를 등록합니다.
   * 노드가 더티 상태로 마크된 동안 리스너가 계속 실행됩니다.
   * 변환 실행 순서에 대한 보장은 없습니다!
   *
   * 무한 루프에 주의하세요. 자세한 내용은 [Node Transforms](https://lexical.dev/docs/concepts/transforms)을 참조하십시오.
   *
   * @param klass - 변환을 실행할 노드의 클래스입니다.
   * @param listener - 노드가 업데이트될 때 실행할 로직입니다.
   * @returns 등록된 리스너를 정리하는 해제 함수입니다.
   */
  registerNodeTransform<T extends LexicalNode>(
    klass: Klass<T>,
    listener: Transform<T>,
  ): () => void {
    const registeredNode = this.registerNodeTransformToKlass(klass, listener)
    const registeredNodes = [registeredNode]

    const replaceWithKlass = registeredNode.replaceWithKlass
    if (replaceWithKlass != null) {
      const registeredReplaceWithNode = this.registerNodeTransformToKlass(
        replaceWithKlass,
        listener as Transform<LexicalNode>,
      )
      registeredNodes.push(registeredReplaceWithNode)
    }

    markAllNodesAsDirty(this, klass.getType())
    return () => {
      registeredNodes.forEach((node) =>
        node.transforms.delete(listener as Transform<LexicalNode>),
      )
    }
  }
  /**
   * 특정 노드가 등록되었는지 확인하는 데 사용됩니다. 주로 플러그인이 의존하는 노드가 등록되었는지 확인하기 위해 사용됩니다.
   *
   * @param node - 등록 여부를 확인할 노드 클래스입니다.
   * @returns 제공된 노드 타입이 에디터에 등록되어 있으면 true, 그렇지 않으면 false를 반환합니다.
   */
  hasNode<T extends Klass<LexicalNode>>(node: T): boolean {
    return this._nodes.has(node.getType())
  }
  /**
   * 특정 노드들이 모두 등록되었는지 확인하는 데 사용됩니다. 주로 플러그인이 의존하는 노드들이 등록되었는지 확인하기 위해 사용됩니다.
   *
   * @param nodes - 등록 여부를 확인할 노드 클래스 배열입니다.
   * @returns 제공된 모든 노드 타입이 에디터에 등록되어 있으면 true, 그렇지 않으면 false를 반환합니다.
   */
  hasNodes<T extends Klass<LexicalNode>>(nodes: Array<T>): boolean {
    return nodes.every(this.hasNode.bind(this))
  }
  /**
   * 지정된 타입과 페이로드로 명령을 디스패치합니다.
   * 이는 해당 타입에 대해 등록된 모든 명령 리스너({@link LexicalEditor.registerCommand})를 트리거하여
   * 제공된 페이로드를 전달합니다.
   *
   * @param type - 트리거할 명령 리스너의 타입입니다.
   * @param payload - 명령 리스너에게 인수로 전달할 데이터입니다.
   * @returns 명령이 성공적으로 디스패치되었는지 여부를 나타내는 boolean 값을 반환합니다.
   */
  dispatchCommand<TCommand extends LexicalCommand<unknown>>(
    type: TCommand,
    payload: CommandPayloadType<TCommand>,
  ): boolean {
    return dispatchCommand(this, type, payload)
  }
  /**
   * 에디터의 모든 데코레이터를 가져옵니다.
   *
   * @returns 각 데코레이터 키와 그에 대응하는 장식된 내용을 매핑한 객체를 반환합니다.
   */
  getDecorators<T>(): Record<NodeKey, T> {
    return this._decorators as Record<NodeKey, T>
  }
  /**
   * 현재 에디터의 루트 요소를 반환합니다. 이벤트 리스너를 등록하려면 이 참조가 안정적이지 않을 수 있으므로
   * {@link LexicalEditor.registerRootListener}를 통해 등록하는 것이 좋습니다.
   *
   * @returns 에디터의 현재 루트 요소를 반환합니다. 루트 요소가 없으면 null을 반환합니다.
   */
  getRootElement(): null | HTMLElement {
    return this._rootElement
  }
  /**
   * 에디터의 키를 가져옵니다.
   *
   * @returns 에디터 키를 반환합니다.
   */
  getKey(): string {
    return this._key
  }
  /**
   * 명령적으로 Lexical이 이벤트를 듣는 루트 contenteditable 요소를 설정합니다.
   *
   * @param nextRootElement - 설정할 다음 루트 요소입니다. null일 수도 있습니다.
   */
  setRootElement(nextRootElement: null | HTMLElement): void {
    const prevRootElement = this._rootElement

    if (nextRootElement !== prevRootElement) {
      const classNames = getCachedClassNameArray(this._config.theme, 'root')
      const pendingEditorState = this._pendingEditorState || this._editorState
      this._rootElement = nextRootElement
      resetEditor(this, prevRootElement, nextRootElement, pendingEditorState)

      if (prevRootElement !== null) {
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          removeRootElementEvents(prevRootElement)
        }
        if (classNames != null) {
          prevRootElement.classList.remove(...classNames)
        }
      }

      if (nextRootElement !== null) {
        const windowObj = getDefaultView(nextRootElement)
        const style = nextRootElement.style
        style.userSelect = 'text'
        style.whiteSpace = 'pre-wrap'
        style.wordBreak = 'break-word'
        nextRootElement.setAttribute('data-lexical-editor', 'true')
        this._window = windowObj
        this._dirtyType = FULL_RECONCILE
        initMutationObserver(this)

        this._updateTags.add('history-merge')

        $commitPendingUpdates(this)

        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, this)
        }
        if (classNames != null) {
          nextRootElement.classList.add(...classNames)
        }
      } else {
        // If content editable is unmounted we'll reset editor state back to original
        // (or pending) editor state since there will be no reconciliation
        this._editorState = pendingEditorState
        this._pendingEditorState = null
        this._window = null
      }

      triggerListeners('root', this, false, nextRootElement, prevRootElement)
    }
  }
  /**
   * 주어진 키에 해당하는 LexicalNode와 연관된 HTMLElement를 가져옵니다.
   *
   * @param key - LexicalNode의 키입니다.
   * @returns 키와 연관된 LexicalNode가 렌더링한 HTMLElement를 반환합니다. 요소가 없으면 null을 반환합니다.
   */
  getElementByKey(key: NodeKey): HTMLElement | null {
    return this._keyToDOMMap.get(key) || null
  }
  /**
   * Gets the active editor state.
   * @returns The editor state
   */
  getEditorState(): EditorState {
    return this._editorState
  }
  /**
   * 명령적으로 EditorState를 설정합니다. 업데이트처럼 조정(reconciliation)을 트리거합니다.
   *
   * @param editorState - 에디터에 설정할 상태입니다.
   * @param options - 업데이트 옵션입니다.
   */
  setEditorState(editorState: EditorState, options?: EditorSetOptions): void {
    if (editorState.isEmpty()) {
      invariant(
        false,
        "setEditorState: the editor state is empty. Ensure the editor state's root node never becomes empty.",
      )
    }

    $flushRootMutations(this)
    const pendingEditorState = this._pendingEditorState
    const tags = this._updateTags
    const tag = options !== undefined ? options.tag : null

    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
      if (tag != null) {
        tags.add(tag)
      }

      $commitPendingUpdates(this)
    }

    this._pendingEditorState = editorState
    this._dirtyType = FULL_RECONCILE
    this._dirtyElements.set('root', false)
    this._compositionKey = null

    if (tag != null) {
      tags.add(tag)
    }

    $commitPendingUpdates(this)
  }
  /**
   * SerializedEditorState를 구문 분석하여 EditorState 객체를 반환합니다.
   * 이 객체는 예를 들어 {@link LexicalEditor.setEditorState}에 전달될 수 있습니다.
   * 주로 데이터베이스에 저장된 JSON에서 역직렬화할 때 이 메서드를 사용합니다.
   *
   * @param maybeStringifiedEditorState - 직렬화된 에디터 상태 또는 JSON 문자열입니다.
   * @param updateFn - 선택적 업데이트 함수입니다.
   * @returns 구문 분석된 EditorState 객체를 반환합니다.
   */
  parseEditorState(
    maybeStringifiedEditorState: string | SerializedEditorState,
    updateFn?: () => void,
  ): EditorState {
    const serializedEditorState =
      typeof maybeStringifiedEditorState === 'string'
        ? JSON.parse(maybeStringifiedEditorState)
        : maybeStringifiedEditorState
    return parseEditorState(serializedEditorState, this, updateFn)
  }
  /**
   * 에디터 상태를 읽는 작업을 실행합니다. 에디터 컨텍스트를 사용할 수 있으며,
   * 이는 내보내기 및 읽기 전용 DOM 작업에 유용합니다. 업데이트와 유사하지만,
   * 에디터 상태의 변이를 방지합니다. 읽기 전에 모든 대기 중인 업데이트가 즉시 커밋됩니다.
   *
   * @param callbackFn - 읽기 전용 에디터 상태에 접근할 수 있는 함수입니다.
   * @returns 콜백 함수의 반환값을 반환합니다.
   */
  read<T>(callbackFn: () => T): T {
    $commitPendingUpdates(this)
    return this.getEditorState().read(callbackFn, { editor: this })
  }
  /**
   * 에디터 상태를 업데이트합니다. `updateFn` 콜백은 Lexical 에디터 상태를 안전하게 변경할 수 있는 유일한 장소입니다.
   *
   * @param updateFn - 쓰기 가능한 에디터 상태에 접근할 수 있는 함수입니다.
   * @param options - 업데이트 동작을 제어하기 위한 옵션 객체입니다.
   * @param options.onUpdate - 업데이트가 완료되면 실행할 함수입니다.
   * 특정 경우에 업데이트를 동기화하는 데 유용합니다.
   * @param options.skipTransforms - true로 설정하면 이 업데이트 사이클에서 모든 노드 변환을 억제합니다.
   * @param options.tag - 업데이트 리스너에서 이 업데이트를 식별하기 위한 태그입니다.
   * 일부 태그는 코어에 의해 예약되어 있으며 업데이트 동작을 다양한 방식으로 제어합니다.
   * @param options.discrete - true인 경우 이 업데이트가 배치되는 것을 방지하여 동기적으로 실행되도록 강제합니다.
   */
  update(updateFn: () => void, options?: EditorUpdateOptions): void {
    updateEditor(this, updateFn, options)
  }
  /**
   * 에디터에 포커스를 설정합니다.
   *
   * @param callbackFn - 에디터에 포커스가 설정된 후 실행할 함수입니다.
   * @param options - 옵션 객체입니다.
   * @param options.defaultSelection - 에디터가 포커스될 때 선택 영역을 이동할 위치입니다.
   * rootStart, rootEnd, 또는 undefined일 수 있습니다. 기본값은 rootEnd입니다.
   */
  focus(callbackFn?: () => void, options: EditorFocusOptions = {}): void {
    const rootElement = this._rootElement

    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off')
      updateEditor(
        this,
        () => {
          const selection = $getSelection()
          const root = $getRoot()

          if (selection !== null) {
            // Marking the selection dirty will force the selection back to it
            selection.dirty = true
          } else if (root.getChildrenSize() !== 0) {
            if (options.defaultSelection === 'rootStart') {
              root.selectStart()
            } else {
              root.selectEnd()
            }
          }
        },
        {
          onUpdate: () => {
            rootElement.removeAttribute('autocapitalize')
            if (callbackFn) {
              callbackFn()
            }
          },
          tag: 'focus',
        },
      )
      // In the case where onUpdate doesn't fire (due to the focus update not
      // occuring).
      if (this._pendingEditorState === null) {
        rootElement.removeAttribute('autocapitalize')
      }
    }
  }
  /**
   * 에디터에서 포커스를 제거합니다.
   */
  blur(): void {
    const rootElement = this._rootElement

    if (rootElement !== null) {
      rootElement.blur()
    }

    const domSelection = getDOMSelection(this._window)

    if (domSelection !== null) {
      domSelection.removeAllRanges()
    }
  }
  /**
   * Returns true if the editor is editable, false otherwise.
   * @returns True if the editor is editable, false otherwise.
   */
  isEditable(): boolean {
    return this._editable
  }
  /**
   * Sets the editable property of the editor. When false, the
   * editor will not listen for user events on the underling contenteditable.
   * @param editable - the value to set the editable mode to.
   */
  setEditable(editable: boolean): void {
    if (this._editable !== editable) {
      this._editable = editable
      triggerListeners('editable', this, true, editable)
    }
  }
  /**
   * Returns a JSON-serializable javascript object NOT a JSON string.
   * You still must call JSON.stringify (or something else) to turn the
   * state into a string you can transfer over the wire and store in a database.
   *
   * See {@link LexicalNode.exportJSON}
   *
   * @returns A JSON-serializable javascript object
   */
  toJSON(): SerializedEditor {
    return {
      editorState: this._editorState.toJSON(),
    }
  }
}

export function resetEditor(
  editor: LexicalEditor,
  prevRootElement: null | HTMLElement,
  nextRootElement: null | HTMLElement,
  pendingEditorState: EditorState,
): void {
  const keyNodeMap = editor._keyToDOMMap
  keyNodeMap.clear()
  editor._editorState = createEmptyEditorState()
  editor._pendingEditorState = pendingEditorState
  editor._compositionKey = null
  editor._dirtyType = NO_DIRTY_NODES
  editor._cloneNotNeeded.clear()
  editor._dirtyLeaves = new Set()
  editor._dirtyElements.clear()
  editor._normalizedNodes = new Set()
  editor._updateTags = new Set()
  editor._updates = []
  editor._blockCursorElement = null

  const observer = editor._observer

  if (observer !== null) {
    observer.disconnect()
    editor._observer = null
  }

  // Remove all the DOM nodes from the root element
  if (prevRootElement !== null) {
    prevRootElement.textContent = ''
  }

  if (nextRootElement !== null) {
    nextRootElement.textContent = ''
    keyNodeMap.set('root', nextRootElement)
  }
}

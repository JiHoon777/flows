import { NO_DIRTY_NODES } from '@/lib/lexical/lexical-constants.ts'
import type {
  LexicalNode,
  SerializedLexicalNode,
} from '@/lib/lexical/lexical-node.ts'
import {
  getActiveEditor,
  isCurrentlyReadOnlyMode,
} from '@/lib/lexical/lexical-updates.ts'
import { $getRoot } from '@/lib/lexical/lexical-utils.ts'
import { $isDecoratorNode } from '@/lib/lexical/nodes/lexical-decorator-node.ts'
import type { SerializedElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'
import {
  $isElementNode,
  ElementNode,
} from '@/lib/lexical/nodes/lexical-element-node.ts'
import invariant from '@/utils/invariant.ts'

export type SerializedRootNode<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> = SerializedElementNode<T>

/** @noInheritDoc */
export class RootNode extends ElementNode {
  /** @internal */
  __cachedText: null | string

  static getType(): string {
    return 'root'
  }

  static clone(): RootNode {
    return new RootNode()
  }

  constructor() {
    super('root')
    this.__cachedText = null
  }

  getTopLevelElementOrThrow(): never {
    invariant(
      false,
      'getTopLevelElementOrThrow: root nodes are not top level elements',
    )
  }

  getTextContent(): string {
    const cachedText = this.__cachedText
    if (
      isCurrentlyReadOnlyMode() ||
      getActiveEditor()._dirtyType === NO_DIRTY_NODES
    ) {
      if (cachedText !== null) {
        return cachedText
      }
    }
    return super.getTextContent()
  }

  remove(): never {
    invariant(false, 'remove: cannot be called on root nodes')
  }

  replace<N = LexicalNode>(_node: N): never {
    invariant(false, 'replace: cannot be called on root nodes')
  }

  insertBefore(_nodeToInsert: LexicalNode): LexicalNode {
    invariant(false, 'insertBefore: cannot be called on root nodes')
  }

  insertAfter(_nodeToInsert: LexicalNode): LexicalNode {
    invariant(false, 'insertAfter: cannot be called on root nodes')
  }

  // View

  updateDOM(_prevNode: RootNode, _dom: HTMLElement): false {
    return false
  }

  // Mutate

  append(...nodesToAppend: LexicalNode[]): this {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const node = nodesToAppend[i]
      if (!$isElementNode(node) && !$isDecoratorNode(node)) {
        invariant(
          false,
          'rootNode.append: Only element or decorator nodes can be appended to the root node',
        )
      }
    }
    return super.append(...nodesToAppend)
  }

  static importJSON(serializedNode: SerializedRootNode): RootNode {
    // We don't create a root, and instead use the existing root.
    const node = $getRoot()
    node.setFor
    return node
  }
}

export function $createRootNode(): RootNode {
  return new RootNode()
}

export function $isRootNode(
  node: RootNode | LexicalNode | null | undefined,
): node is RootNode {
  return node instanceof RootNode
}

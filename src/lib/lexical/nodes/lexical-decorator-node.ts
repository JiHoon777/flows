import type { LexicalEditor } from '@/lib/lexical/lexical-editor.ts'
import type { NodeKey } from '@/lib/lexical/lexical-node.ts'
import type { KlassConstructor } from '@/lib/lexical/lexical-type.ts'
import type { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

import { LexicalNode } from '@/lib/lexical/lexical-node.ts'
import invariant from '@/utils/invariant.ts'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface DecoratorNode<T> {
  getTopLevelElement(): ElementNode | this | null
  getTopLevelElementOrThrow(): ElementNode | this
}

/** @noInheritDoc */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class DecoratorNode<T> extends LexicalNode {
  declare ['constructor']: KlassConstructor<typeof DecoratorNode<T>>

  constructor(key?: NodeKey) {
    super(key)
  }

  /**
   * 이 메서드의 반환값은 LexicalEditor._decorators에 추가됩니다.
   * 데코레이터 노드의 실제 렌더링 로직을 정의합니다.
   */
  decorate(_editor: LexicalEditor, _config: any): T {
    invariant(false, 'decorate: base method not extended')
  }

  /**
   * 노드가 독립적(isolated)인지 여부를 반환합니다.
   * 기본적으로 false 를 반환하며, 필요시 하위 클래스에서 오버라이드 할 수 있습니다.
   */
  isIsolated(): boolean {
    return false
  }

  /**
   * 노드가 인라인 요소인지 여부를 반환합니다.
   * 기본적으로 true 를 반환하며, 필요시 하위 클래스에서 오버라이드 할 수 있습니다.
   */
  isInline(): boolean {
    return true
  }

  /**
   * 노드가 키보드로 선택 가능한지 여부를 반환합니다.
   * 기본적으로 true 를 반환하며, 필요시 하위 클래스에서 오버라이드 할 수 있습니다.
   */
  isKeyboardSelectable(): boolean {
    return true
  }
}

export function $isDecoratorNode<T>(
  node: LexicalNode | null | undefined,
): node is DecoratorNode<T> {
  return node instanceof DecoratorNode
}

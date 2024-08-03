// TODO: Cleanup ArtificialNode__DO_NOT_USE #5966
import type { EditorConfig } from '@/lib/lexical/lexical-editor.type.ts'

import { ElementNode } from '@/lib/lexical/nodes/lexical-element-node.ts'

export class ArtificialNode__DO_NOT_USE extends ElementNode {
  static getType(): string {
    return 'artificial'
  }

  createDOM(_config: EditorConfig): HTMLElement {
    // this isnt supposed to be used and is not used anywhere but defining it to appease the API
    const dom = document.createElement('div')
    return dom
  }
}

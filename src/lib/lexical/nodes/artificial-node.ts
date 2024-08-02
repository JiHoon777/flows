import { ElementNode } from './lexical-element-node'
import type { EditorConfig } from '../lexical-editor.type'

// TODO: Cleanup ArtificialNode__DO_NOT_USE #5966
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

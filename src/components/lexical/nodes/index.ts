import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { Klass, LexicalNode } from 'lexical'

import { CollapsibleContainerNode } from '@/components/lexical/nodes/collapsible/collapsible-container.node.ts'
import { CollapsibleContentNode } from '@/components/lexical/nodes/collapsible/collapsible-content-node.ts'
import { CollapsibleTitleNode } from '@/components/lexical/nodes/collapsible/collapsible-title-node.ts'
import { ExcalidrawNode } from '@/components/lexical/nodes/excalidraw'
import { ImageNode } from '@/components/lexical/nodes/image'

export const LexicalNodes: Klass<LexicalNode>[] = [
  //
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  HorizontalRuleNode,
  LinkNode,
  AutoLinkNode,
  ExcalidrawNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  ImageNode,
  // ExcalidrawNode
  // StickyNode
  // ImageNode
]

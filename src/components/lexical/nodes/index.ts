import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { Klass, LexicalNode } from 'lexical'

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
  // ExcalidrawNode
  // StickyNode
  // CollapsibleNode
  // ImageNode
]

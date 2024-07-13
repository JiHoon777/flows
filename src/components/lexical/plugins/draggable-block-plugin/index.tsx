import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'

import { useDraggableBlockMenu } from '@/components/lexical/plugins/draggable-block-plugin/use-draggable-block-menu.tsx'

export const DraggableBlockPlugin = ({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement
}) => {
  const [editor] = useLexicalComposerContext()

  return useDraggableBlockMenu(editor, anchorElem, editor._editable)
}

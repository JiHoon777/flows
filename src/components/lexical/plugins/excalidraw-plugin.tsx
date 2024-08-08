import type { LexicalCommand } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $wrapNodeInElement } from '@lexical/utils'
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from 'lexical'
import { useEffect } from 'react'

import {
  $createExcalidrawNode,
  ExcalidrawNode,
} from '@/components/lexical/nodes/excalidraw'

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_EXCALIDRAW_COMMAND',
)

export const ExcalidrawPlugin = (): null => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (!editor.hasNodes([ExcalidrawNode])) {
      throw new Error(
        'ExcalidrawPlugin: ExcalidrawNode not registered on editor',
      )
    }

    return editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        const excalidrawNode = $createExcalidrawNode()
        console.log(36, excalidrawNode)

        $insertNodes([excalidrawNode])
        if ($isRootOrShadowRoot(excalidrawNode.getParentOrThrow())) {
          $wrapNodeInElement(excalidrawNode, $createParagraphNode).selectEnd()
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor])

  return null
}

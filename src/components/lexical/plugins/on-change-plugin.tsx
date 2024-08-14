import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import { $createParagraphNode, EditorState } from 'lexical'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { debounce } from 'lodash-es'
import { useEffect } from 'react'

// When the editor changes, you can get notified via the
// OnChangePlugin!
export const OnChangePlugin = ({
  initialEditorState,
  onChange,
}: {
  initialEditorState: InitialEditorStateType
  onChange: (state: string) => void
}) => {
  // Access the editor through the LexicalComposerContext
  const [editor] = useLexicalComposerContext()

  // Wrap our listener in useEffect to handle the teardown and avoid stale references.
  useEffect(() => {
    const debouncedChangeHandler = debounce((editorState: EditorState) => {
      const editorStateJSON = editorState.toJSON()

      onChange(JSON.stringify(editorStateJSON))
    }, 500)

    // most listeners return a teardown function that can be called to clean them up.
    return editor.registerUpdateListener(({ editorState }) => {
      // call onChange here to pass the latest state up to the parent.
      debouncedChangeHandler(editorState)
    })
  }, [editor, onChange])

  useEffect(() => {
    queueMicrotask(() => {
      if (initialEditorState) {
        const editorState = editor.parseEditorState(
          initialEditorState as string,
        )
        editor.setEditorState(editorState)
      } else {
        // initialEditorState가 없을 때 빈 단락으로 초기화
        editor.update(() => {
          const root = $getRoot()
          if (root.isEmpty()) {
            const paragraph = $createParagraphNode()
            root.append(paragraph)
          }
        })
      }
    })
  }, [editor, initialEditorState])

  return null
}

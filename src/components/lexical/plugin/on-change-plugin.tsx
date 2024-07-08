import { useEffect } from 'react'

import { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { EditorState } from 'lexical'
import { debounce } from 'lodash-es'

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
    if (!initialEditorState) {
      return
    }

    const editorState = editor.parseEditorState(initialEditorState as string)
    editor.setEditorState(editorState)
    console.log(editorState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return null
}

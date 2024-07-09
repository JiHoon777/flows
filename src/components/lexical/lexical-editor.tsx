import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import {
  InitialEditorStateType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'

import { lexicalEditorTheme } from '@/components/lexical/lexical-editor-theme.ts'
import { LexicalNodes } from '@/components/lexical/nodes'
import { OnChangePlugin } from '@/components/lexical/plugins/on-change-plugin.tsx'

export const LexicalEditor = ({
  initialEditorState,
  onChange,
}: {
  initialEditorState: InitialEditorStateType
  onChange: (editorState: string) => void
}) => {
  const initialConfig = {
    namespace: 'NodeEditor,',
    theme: lexicalEditorTheme,
    onError,
    nodes: [...LexicalNodes],
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={'relative flex flex-col w-full min-h-full p-5 mb-10'}>
        <AutoFocusPlugin />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={'w-full min-h-full border-none outline-none mb-10'}
            />
          }
          placeholder={
            <div className={'absolute top-5 left-5'}>Enter some text...</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <OnChangePlugin
          initialEditorState={initialEditorState}
          onChange={onChange}
        />
      </div>
      {/*<TreeViewPlugin />*/}
    </LexicalComposer>
  )
}

const onError = (error: Error) => {
  console.error(error)
}

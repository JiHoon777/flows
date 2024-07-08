import { LexicalNodes } from '@/components/lexical/nodes'
import { OnChangePlugin } from '@/components/lexical/plugin/on-change-plugin'
import { lexicalEditorTheme } from '@/components/lexical/themes/lexcial-editor-theme'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import {
  InitialEditorStateType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'

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

  console.log('hi')
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={'relative w-full h-full'}>
        <AutoFocusPlugin />
        <HashtagPlugin />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={'w-full min-h-[300px] border-none outline-none'}
            />
          }
          placeholder={
            <div className={'absolute top-0 left-0'}>Enter some text...</div>
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

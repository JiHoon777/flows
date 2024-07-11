import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import {
  InitialEditorStateType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import {
  DEFAULT_TRANSFORMERS,
  MarkdownShortcutPlugin,
} from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { observer } from 'mobx-react'

import { lexicalEditorTheme } from '@/components/lexical/lexical-editor-theme.ts'
import { LexicalNodes } from '@/components/lexical/nodes'
import { CodeHighlightPlugin } from '@/components/lexical/plugins/code-highlight-plugin.tsx'
import { ComponentPickerMenuPlugin } from '@/components/lexical/plugins/component-picker-menu-plugin/component-picker-menu-plugin.tsx'
import { ListMaxIndentLevelPlugin } from '@/components/lexical/plugins/list-max-indent-level-plugin.tsx'
import { OnChangePlugin } from '@/components/lexical/plugins/on-change-plugin.tsx'
import { TreeViewPlugin } from '@/components/lexical/plugins/tree-view-plugin.tsx'

type Props = {
  initialEditorState: InitialEditorStateType
  onChange: (editorState: string) => void
  showTreeView?: boolean
}

export const LexicalEditor = observer((props: Props) => {
  const initialConfig = {
    namespace: 'NodeEditor,',
    theme: lexicalEditorTheme,
    onError,
    nodes: [...LexicalNodes],
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalEditor_ {...props} />
    </LexicalComposer>
  )
})

const LexicalEditor_ = observer(
  ({
    initialEditorState,
    onChange,
    showTreeView = false,
  }: {
    initialEditorState: InitialEditorStateType
    onChange: (editorState: string) => void
    showTreeView?: boolean
  }) => {
    return (
      <>
        <div className={'relative w-full'}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={'w-full min-h-[85vh] border-none outline-none'}
              />
            }
            placeholder={
              <div className={'absolute top-0 left-0'}>Enter some text...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin
            initialEditorState={initialEditorState}
            onChange={onChange}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <ListMaxIndentLevelPlugin maxDepth={7} />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={DEFAULT_TRANSFORMERS} />
          <CodeHighlightPlugin />
          <ComponentPickerMenuPlugin />
        </div>
        {showTreeView && <TreeViewPlugin />}
      </>
    )
  },
)

const onError = (error: Error) => {
  console.error(error)
}

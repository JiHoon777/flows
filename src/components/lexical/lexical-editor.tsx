import { useEffect, useState } from 'react'

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import {
  InitialEditorStateType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin'
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
import { LexicalAutoLinkPlugin } from '@/components/lexical/plugins/auto-link-plugin.tsx'
import { CodeHighlightPlugin } from '@/components/lexical/plugins/code-highlight-plugin.tsx'
import { ComponentPickerMenuPlugin } from '@/components/lexical/plugins/component-picker-menu-plugin'
import { ExcalidrawPlugin } from '@/components/lexical/plugins/excalidraw-plugin.tsx'
import { FloatingLinkEditorPlugin } from '@/components/lexical/plugins/floating-link-editor-plugin'
import { FloatingTextFormatToolbarPlugin } from '@/components/lexical/plugins/floating-text-format-toolbar-plugin'
import { LinkPlugin } from '@/components/lexical/plugins/link-plugin.tsx'
import { ListMaxIndentLevelPlugin } from '@/components/lexical/plugins/list-max-indent-level-plugin.tsx'
import { OnChangePlugin } from '@/components/lexical/plugins/on-change-plugin.tsx'
import { TreeViewPlugin } from '@/components/lexical/plugins/tree-view-plugin.tsx'

const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'

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
    const [floatingAnchorElem, setFloatingAnchorElem] =
      useState<HTMLDivElement | null>(null)
    const [isSmallWidthViewport, setIsSmallWidthViewport] =
      useState<boolean>(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false)

    const onRef = (_floatingAnchorElem: HTMLDivElement) => {
      if (_floatingAnchorElem !== null) {
        setFloatingAnchorElem(_floatingAnchorElem)
      }
    }

    useEffect(() => {
      const updateViewPortWidth = () => {
        const isNextSmallWidthViewport =
          CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches

        if (isNextSmallWidthViewport !== isSmallWidthViewport) {
          setIsSmallWidthViewport(isNextSmallWidthViewport)
        }
      }
      updateViewPortWidth()
      window.addEventListener('resize', updateViewPortWidth)

      return () => {
        window.removeEventListener('resize', updateViewPortWidth)
      }
    }, [isSmallWidthViewport])

    return (
      <>
        <div className={'relative w-full'}>
          <RichTextPlugin
            contentEditable={
              <div ref={onRef}>
                <ContentEditable
                  className={'w-full min-h-[85vh] border-none outline-none'}
                />
              </div>
            }
            placeholder={
              <div className={'absolute top-0 left-0'}>Enter some text...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {/* Floating Toolbar Plugins */}
          {floatingAnchorElem && !isSmallWidthViewport && (
            <>
              <FloatingTextFormatToolbarPlugin
                setIsLinkEditMode={setIsLinkEditMode}
                anchorElem={floatingAnchorElem}
              />
              <FloatingLinkEditorPlugin
                anchorElem={floatingAnchorElem}
                isLinkEditMode={isLinkEditMode}
                setIsLinkEditMode={setIsLinkEditMode}
              />
            </>
          )}
          {/* */}
          <OnChangePlugin
            initialEditorState={initialEditorState}
            onChange={onChange}
          />
          {/* Util Plugins */}
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListMaxIndentLevelPlugin maxDepth={7} />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={DEFAULT_TRANSFORMERS} />
          <LexicalAutoLinkPlugin />
          <ComponentPickerMenuPlugin />
          {/* Node Plugins */}
          <ListPlugin />
          <CheckListPlugin />
          <CodeHighlightPlugin />
          <LinkPlugin />
          <LexicalAutoLinkPlugin />
          <HorizontalRulePlugin />
          <ExcalidrawPlugin />
        </div>
        {showTreeView && <TreeViewPlugin />}
      </>
    )
  },
)

const onError = (error: Error) => {
  console.error(error)
}

import { Dispatch, useCallback, useEffect, useRef } from 'react'

import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { mergeRegister } from '@lexical/utils'
import { FontBoldIcon } from '@radix-ui/react-icons'
import {
  $getSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import {
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  UnderlineIcon,
} from 'lucide-react'

import { lexicalUtils } from '@/components/lexical/utils/lexical.utils.ts'
import { Button } from '@/components/ui/button.tsx'

const getButtonClassNameBy = (is: boolean) => (is ? 'secondary' : 'ghost')
const ICON_SIZE = 'w-4 h-4'

export const TextFormatFloatingToolbar = ({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor
  anchorElem: HTMLElement
  isBold: boolean
  isCode: boolean
  isItalic: boolean
  isLink: boolean
  isStrikethrough: boolean
  isSubscript: boolean
  isSuperscript: boolean
  isUnderline: boolean
  setIsLinkEditMode: Dispatch<boolean>
}) => {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null)

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true)
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://')
    } else {
      setIsLinkEditMode(false)
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }, [editor, isLink, setIsLinkEditMode])

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection()

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current
    const nativeSelection = window.getSelection()

    if (!popupCharStylesEditorElem) {
      return
    }

    const rootElement = editor.getRootElement()
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = lexicalUtils.getDOMRangeRect(
        nativeSelection,
        rootElement,
      )

      lexicalUtils.setFloatingElemPosition(
        rangeRect,
        popupCharStylesEditorElem,
        anchorElem,
        isLink,
      )
    }
  }, [anchorElem, editor, isLink])

  useEffect(() => {
    const scrollerEl = anchorElem.parentElement

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar()
      })
    }

    window.addEventListener('resize', update)
    if (scrollerEl) {
      scrollerEl.addEventListener('scroll', update)
    }

    return () => {
      window.removeEventListener('resize', update)
      if (scrollerEl) {
        scrollerEl.removeEventListener('scroll', update)
      }
    }
  }, [$updateTextFormatFloatingToolbar, anchorElem, editor])

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar()
    })
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar()
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [$updateTextFormatFloatingToolbar, editor])

  return (
    <div
      ref={popupCharStylesEditorRef}
      className={
        'flex bg-[#fff] absolute top-0 left-0 z-10 drop-shadow-md h-6 rounded-lg'
      }
    >
      {editor.isEditable() && (
        <>
          <Button
            variant={getButtonClassNameBy(isBold)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format text as bold'}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          >
            <FontBoldIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isItalic)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format text as italics'}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
            }
          >
            <ItalicIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isUnderline)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format text to underlined'}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
            }
          >
            <UnderlineIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isStrikethrough)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format text with a strikethrough'}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
            }
          >
            <StrikethroughIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isSubscript)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format Subscript'}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')
            }
          >
            <SubscriptIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isSuperscript)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Format Superscript'}
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')
            }
          >
            <SuperscriptIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isCode)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Insert code block'}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
          >
            <CodeIcon className={ICON_SIZE} />
          </Button>
          <Button
            variant={getButtonClassNameBy(isLink)}
            size={'xs'}
            rounded={'none'}
            aria-label={'Insert Link'}
            onClick={insertLink}
          >
            <LinkIcon className={ICON_SIZE} />
          </Button>
        </>
      )}
    </div>
  )
}

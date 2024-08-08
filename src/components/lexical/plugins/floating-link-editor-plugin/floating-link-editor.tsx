import type { BaseSelection, LexicalEditor } from 'lexical'
import type { Dispatch } from 'react'

import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'

import { lexicalUtils } from '@/components/lexical/utils/lexical.utils.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'

export const FloatingLinkEditor = ({
  editor,
  isLink,
  setIsLink,
  anchorElem,
  isLinkEditMode,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor
  isLink: boolean
  setIsLink: Dispatch<boolean>
  anchorElem: HTMLElement
  isLinkEditMode: boolean
  setIsLinkEditMode: Dispatch<boolean>
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [editedLinkUrl, setEditedLinkUrl] = useState('https://')
  const [lastSelection, setLastSelection] = useState<BaseSelection | null>(null)

  const $updateLinkEditor = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      const node = lexicalUtils.getSelectedNode(selection)
      const linkParent = $findMatchingParent(node, $isLinkNode)

      if (linkParent) {
        setLinkUrl(linkParent.getURL())
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL())
      } else {
        setLinkUrl('')
      }
      if (isLinkEditMode) {
        setEditedLinkUrl(linkUrl)
      }
    }

    const editorElem = editorRef.current
    const nativeSelection = window.getSelection()
    const activeElement = document.activeElement

    if (editorElem === null) {
      return
    }

    const rootElement = editor.getRootElement()

    if (
      selection !== null &&
      nativeSelection !== null &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode) &&
      editor.isEditable()
    ) {
      const domRect: DOMRect | undefined =
        nativeSelection.focusNode?.parentElement?.getBoundingClientRect()
      if (domRect) {
        domRect.y += 40
        lexicalUtils.setFloatingElemPositionForLinkEditor(
          domRect,
          editorElem,
          anchorElem,
        )
      }
      setLastSelection(selection)
    } else if (!activeElement || activeElement.className !== 'link-input') {
      if (rootElement !== null) {
        lexicalUtils.setFloatingElemPositionForLinkEditor(
          null,
          editorElem,
          anchorElem,
        )
      }
      setLastSelection(null)
      setIsLinkEditMode(false)
      setLinkUrl('')
    }

    return true
  }, [anchorElem, editor, setIsLinkEditMode, isLinkEditMode, linkUrl])

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement

    const update = () => {
      editor.getEditorState().read(() => {
        $updateLinkEditor()
      })
    }

    window.addEventListener('resize', update)

    if (scrollerElem) {
      scrollerElem.addEventListener('scroll', update)
    }

    return () => {
      window.removeEventListener('resize', update)

      if (scrollerElem) {
        scrollerElem.removeEventListener('scroll', update)
      }
    }
  }, [anchorElem.parentElement, editor, $updateLinkEditor])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateLinkEditor()
        })
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateLinkEditor()
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink) {
            setIsLink(false)
            return true
          }
          return false
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [editor, $updateLinkEditor, setIsLink, isLink])

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateLinkEditor()
    })
  }, [editor, $updateLinkEditor])

  useEffect(() => {
    if (isLinkEditMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLinkEditMode, isLink])

  const monitorInputInteraction = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleLinkSubmission()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsLinkEditMode(false)
    }
  }

  const handleLinkSubmission = () => {
    if (lastSelection !== null) {
      if (linkUrl !== '') {
        editor.dispatchCommand(
          TOGGLE_LINK_COMMAND,
          lexicalUtils.sanitizeUrl(editedLinkUrl),
        )
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            const parent = lexicalUtils.getSelectedNode(selection).getParent()
            if ($isAutoLinkNode(parent)) {
              const linkNode = $createLinkNode(parent.getURL(), {
                rel: parent.__rel,
                target: parent.__target,
                title: parent.__title,
              })
              parent.replace(linkNode, true)
            }
          }
        })
      }
      setEditedLinkUrl('https://')
      setIsLinkEditMode(false)
    }
  }

  return (
    <div
      ref={editorRef}
      className={
        'absolute left-0 top-0 z-10 flex w-full max-w-[320px] rounded-lg bg-[#fff] p-4 drop-shadow-md'
      }
    >
      {isLink && isLinkEditMode && (
        <div className={'flex w-full flex-col gap-1'}>
          <Input
            ref={inputRef}
            value={editedLinkUrl}
            onChange={(e) => setEditedLinkUrl(e.target.value)}
            onKeyDown={(e) => monitorInputInteraction(e)}
          />
          <div
            className={
              'flex w-full justify-end gap-2 border-t border-accent pt-2'
            }
          >
            <Button
              variant={'destructive'}
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsLinkEditMode(false)}
            >
              취소
            </Button>
            <Button
              variant={'default'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLinkSubmission}
            >
              확인
            </Button>
          </div>
        </div>
      )}
      {isLink && !isLinkEditMode && (
        <div className={'flex w-full flex-col gap-1'}>
          <a
            href={lexicalUtils.sanitizeUrl(linkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={
              'cursor-pointer text-[rgb(33,111,219)] no-underline hover:underline'
            }
          >
            {linkUrl}
          </a>
          <div
            className={
              'flex w-full justify-end gap-2 border-t border-accent pt-2'
            }
          >
            <Button
              variant={'outline'}
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setEditedLinkUrl(linkUrl)
                setIsLinkEditMode(true)
              }}
            >
              링크 수정
            </Button>
            <Button
              variant={'destructive'}
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)}
            >
              링크 삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

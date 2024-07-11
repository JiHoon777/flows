import { useCallback, useMemo, useState } from 'react'

import { $createCodeNode } from '@lexical/code'
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { DividerHorizontalIcon } from '@radix-ui/react-icons'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
  TextNode,
} from 'lexical'
import {
  CaseSensitive,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Ruler,
} from 'lucide-react'
import { createPortal } from 'react-dom'

import { ComponentPickerMenuItem } from '@/components/lexical/plugins/component-picker-menu-plugin/component-picker-menu-item.tsx'
import { ComponentPickerOption } from '@/components/lexical/plugins/component-picker-menu-plugin/component-picker-option.ts'

export const ComponentPickerMenuPlugin = () => {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = useState<string | null>(null)

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  })

  const options = useMemo(() => {
    const baseOption = getBaseOptions(editor)

    if (!queryString) {
      return baseOption
    }

    const regex = new RegExp(queryString, 'i')

    return [
      ...baseOption.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword)),
      ),
    ]
  }, [editor, queryString])
  const onSelectOption = useCallback(
    (
      selectedOption: any,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString)
        closeMenu()
      })
    },
    [editor],
  )

  return (
    <>
      <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
        ) =>
          anchorElementRef.current && options.length
            ? createPortal(
                <div>
                  <ul
                    className={
                      'flex flex-col gap-2 w-[300px] bg-gray-100 rounded-lg p-4 h-[200px] overflow-y-auto'
                    }
                  >
                    {options.map((option, i: number) => (
                      <ComponentPickerMenuItem
                        key={option.key}
                        index={i}
                        isSelected={selectedIndex === i}
                        onClick={() => {
                          setHighlightedIndex(i)
                          selectOptionAndCleanUp(option)
                        }}
                        onMouseEnter={() => {
                          setHighlightedIndex(i)
                        }}
                        option={option}
                      />
                    ))}
                  </ul>
                </div>,
                anchorElementRef.current,
              )
            : null
        }
      />
    </>
  )
}

function getBaseOptions(editor: LexicalEditor) {
  return [
    new ComponentPickerOption('Paragraph', {
      icon: <CaseSensitive />,
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode())
          }
        }),
    }),
    ...([1, 2, 3] as const).map(
      (n) =>
        new ComponentPickerOption(`Heading ${n}`, {
          icon: n === 1 ? <Heading1 /> : n === 2 ? <Heading2 /> : <Heading3 />,
          keywords: ['heading', 'header', `h${n}`],
          onSelect: () =>
            editor.update(() => {
              const selection = $getSelection()
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`))
              }
            }),
        }),
    ),
    new ComponentPickerOption('Numbered List', {
      icon: <ListOrdered />,
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Bulleted List', {
      icon: <List />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Check List', {
      icon: <ListChecks />,
      keywords: ['check list', 'todo list'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Quote', {
      icon: <Quote />,
      keywords: ['block quote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode())
          }
        }),
    }),
    new ComponentPickerOption('Code', {
      icon: <Code />,
      keywords: ['javascript', 'python', 'js', 'codebook'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()

          if ($isRangeSelection(selection)) {
            if (selection.isCollapsed()) {
              $setBlocksType(selection, () => $createCodeNode())
            } else {
              const textContent = selection.getTextContent()
              const codeNode = $createCodeNode()
              selection.insertNodes([codeNode])
              selection.insertRawText(textContent)
            }
          }
        }),
    }),
    new ComponentPickerOption('Divider', {
      icon: <DividerHorizontalIcon className={'w-6 h-6'} />,
      keywords: ['horizontal rule', 'divider', 'hr'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    }),
    new ComponentPickerOption('Page Break', {
      icon: <Ruler />,
      keywords: ['page break', 'divider'],
      onSelect: () => {},
    }),
  ]
}

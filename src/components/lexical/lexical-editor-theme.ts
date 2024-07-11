import { EditorThemeClasses } from 'lexical'

export const lexicalEditorTheme: EditorThemeClasses = {
  autocomplete: 'PlaygroundEditorTheme__autocomplete',
  blockCursor: 'PlaygroundEditorTheme__blockCursor',
  characterLimit: 'PlaygroundEditorTheme__characterLimit',
  code: 'PlaygroundEditorTheme__code',
  codeHighlight: {
    atrule: 'PlaygroundEditorTheme__tokenAttr',
    attr: 'PlaygroundEditorTheme__tokenAttr',
    boolean: 'PlaygroundEditorTheme__tokenProperty',
    builtin: 'PlaygroundEditorTheme__tokenSelector',
    cdata: 'PlaygroundEditorTheme__tokenComment',
    char: 'PlaygroundEditorTheme__tokenSelector',
    class: 'PlaygroundEditorTheme__tokenFunction',
    'class-name': 'PlaygroundEditorTheme__tokenFunction',
    comment: 'PlaygroundEditorTheme__tokenComment',
    constant: 'PlaygroundEditorTheme__tokenProperty',
    deleted: 'PlaygroundEditorTheme__tokenProperty',
    doctype: 'PlaygroundEditorTheme__tokenComment',
    entity: 'PlaygroundEditorTheme__tokenOperator',
    function: 'PlaygroundEditorTheme__tokenFunction',
    important: 'PlaygroundEditorTheme__tokenVariable',
    inserted: 'PlaygroundEditorTheme__tokenSelector',
    keyword: 'PlaygroundEditorTheme__tokenAttr',
    namespace: 'PlaygroundEditorTheme__tokenVariable',
    number: 'PlaygroundEditorTheme__tokenProperty',
    operator: 'PlaygroundEditorTheme__tokenOperator',
    prolog: 'PlaygroundEditorTheme__tokenComment',
    property: 'PlaygroundEditorTheme__tokenProperty',
    punctuation: 'PlaygroundEditorTheme__tokenPunctuation',
    regex: 'PlaygroundEditorTheme__tokenVariable',
    selector: 'PlaygroundEditorTheme__tokenSelector',
    string: 'PlaygroundEditorTheme__tokenSelector',
    symbol: 'PlaygroundEditorTheme__tokenProperty',
    tag: 'PlaygroundEditorTheme__tokenProperty',
    url: 'PlaygroundEditorTheme__tokenOperator',
    variable: 'PlaygroundEditorTheme__tokenVariable',
  },
  embedBlock: {
    base: 'PlaygroundEditorTheme__embedBlock',
    focus: 'PlaygroundEditorTheme__embedBlockFocus',
  },
  hashtag:
    'bg-[rgba(88,144,255,0.15)] border-b border-[rgba(88, 144, 255, 0.3)]',
  heading: {
    h1: 'text-2xl text-[rgb(5,5,5)] font-normal m-0',
    h2: 'PlaygroundEditorTheme__h2',
    h3: 'PlaygroundEditorTheme__h3',
    h4: 'PlaygroundEditorTheme__h4',
    h5: 'PlaygroundEditorTheme__h5',
    h6: 'PlaygroundEditorTheme__h6',
  },
  hr: 'PlaygroundEditorTheme__hr',
  image: 'editor-image',
  indent: 'PlaygroundEditorTheme__indent',
  inlineImage: 'inline-editor-image',
  layoutContainer: 'PlaygroundEditorTheme__layoutContainer',
  layoutItem: 'PlaygroundEditorTheme__layoutItem',
  link: 'PlaygroundEditorTheme__link',
  list: {
    checklist: 'PlaygroundEditorTheme__checklist',
    listitem: 'my-0 mx-8',
    listitemChecked: 'PlaygroundEditorTheme__listItemChecked',
    listitemUnchecked: 'PlaygroundEditorTheme__listItemUnchecked',
    nested: {
      listitem: 'list-none before:hidden after:hidden',
    },
    olDepth: [
      'p-0 m-0 list-outside',
      'p-0 m-0 list-outside !list-[upper-alpha]',
      'p-0 m-0 list-outside !list-[lower-alpha]',
      'p-0 m-0 list-outside !list-[upper-roman]',
      'p-0 m-0 list-outside !list-[lower-roman]',
    ],
    ul: 'p-0 m-0 list-outside list-disc',
    ol: 'p-0 m-0 list-outside list-decimal',
  },
  ltr: 'text-left',
  mark: 'PlaygroundEditorTheme__mark',
  markOverlap: 'PlaygroundEditorTheme__markOverlap',
  paragraph: 'm-0 relative',
  quote:
    'm-0 ml-5 mb-2.5 text-[15px] text-[rgb(101, 103, 107)] border-[rgb(206,208,212)] border-left-[4px] pl-4',
  rtl: 'text-right',
  table: 'PlaygroundEditorTheme__table',
  tableCell: 'PlaygroundEditorTheme__tableCell',
  tableCellActionButton: 'PlaygroundEditorTheme__tableCellActionButton',
  tableCellActionButtonContainer:
    'PlaygroundEditorTheme__tableCellActionButtonContainer',
  tableCellEditing: 'PlaygroundEditorTheme__tableCellEditing',
  tableCellHeader: 'PlaygroundEditorTheme__tableCellHeader',
  tableCellPrimarySelected: 'PlaygroundEditorTheme__tableCellPrimarySelected',
  tableCellResizer: 'PlaygroundEditorTheme__tableCellResizer',
  tableCellSelected: 'PlaygroundEditorTheme__tableCellSelected',
  tableCellSortedIndicator: 'PlaygroundEditorTheme__tableCellSortedIndicator',
  tableResizeRuler: 'PlaygroundEditorTheme__tableCellResizeRuler',
  tableSelected: 'PlaygroundEditorTheme__tableSelected',
  tableSelection: 'PlaygroundEditorTheme__tableSelection',
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    code: 'PlaygroundEditorTheme__textCode',
    italic: 'PlaygroundEditorTheme__textItalic',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    subscript: 'PlaygroundEditorTheme__textSubscript',
    superscript: 'PlaygroundEditorTheme__textSuperscript',
    underline: 'PlaygroundEditorTheme__textUnderline',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
  },
}

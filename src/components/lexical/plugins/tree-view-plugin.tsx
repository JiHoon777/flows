import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TreeView } from '@lexical/react/LexicalTreeView'

export const TreeViewPlugin = () => {
  const [editor] = useLexicalComposerContext()

  return (
    <TreeView
      viewClassName="block w-full h-[400px] overflow-y-auto py-10 bg-[#222] text-[#fff] p-0 text-xs mt-px mx-auto mb-2.5 overflow-hidden rounded-bl-lg rounded-br-lg"
      treeTypeButtonClassName="border-0 p-0 text-xs top-2.5 right-[85px] absolute bg-none text-white hover:underline"
      timeTravelPanelClassName="overflow-hidden pt-0 px-0 pb-2.5 m-auto flex"
      timeTravelButtonClassName="border-0 p-0 text-xs top-2.5 right-3.5 absolute bg-none text-white hover:underline"
      timeTravelPanelSliderClassName="p-0 flex-[8]"
      timeTravelPanelButtonClassName="p-0 border-0 bg-none flex-1 text-white text-xs hover:underline"
      editor={editor}
    />
  )
}

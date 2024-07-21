import { useCallback } from 'react'

import { Effect } from 'effect'
import { observer } from 'mobx-react'

import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { DoNode } from '@/store/node/do-node.ts'
import { useStore } from '@/store/useStore.ts'
import { INoteNode } from '@/types/note-node.type.ts'

export const NoteNodeView = observer(({ node }: { node: DoNode }) => {
  const store = useStore()
  const noteSnapshot = node.snapshot as INoteNode

  const handleChangeContent = useCallback(
    (v: string) => {
      Effect.runPromise(
        node.store.updateNode({
          nodeId: node.id,
          changedNode: {
            content: v,
          },
        }),
      ).catch((ex) => store.showError(ex))
    },
    [node.id, node.store, store],
  )

  const initialEditorState = noteSnapshot.content ?? null
  return (
    <>
      <LexicalEditor
        showTreeView={false}
        initialEditorState={initialEditorState}
        onChange={handleChangeContent}
      />
    </>
  )
})

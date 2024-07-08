import { fileSystemAPI } from '@/api/file-system'
import { CommonStateCreator, NodeSlice, StoreType } from '@/store/slice.type'
import { NodeTypes } from '@/store/types'

export const createNodeSlice: CommonStateCreator<StoreType, NodeSlice> = (
  set,
  get,
) => ({
  nodesMap: new Map(),

  updateNode: async (nodeId, changedNode, options) => {
    const existingNode = get().getNodeById(nodeId)
    if (!existingNode) {
      return
    }

    const updatedNode: NodeTypes = {
      ...existingNode,
      ...changedNode,
      data: {
        ...existingNode.data,
        ...changedNode.data,
      },
      style: {
        ...existingNode.style,
        ...changedNode.style,
      },
      updated_at: new Date(),
    }

    set((state) => {
      state.nodesMap.set(nodeId, updatedNode)
    })

    try {
      await fileSystemAPI.saveNodeToFile(updatedNode)
    } catch (ex) {
      console.error(ex)
      set((state) => {
        state.nodesMap.set(nodeId, {
          ...existingNode,
        })
      })
      options?.onFail?.()
    }
  },

  getNodeById: (id: string) => get().nodesMap.get(id),
})

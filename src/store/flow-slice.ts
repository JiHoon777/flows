import { fileSystemAPI } from '@/api/file-system'
import { CommonStateCreator, FlowSlice, StoreType } from '@/store/slice.type'
import { Flow } from '@/store/types'

export const createFlowSlice: CommonStateCreator<StoreType, FlowSlice> = (
  set,
  get,
) => ({
  flowsMap: new Map(),

  updateFlow: async (nodeId, changedFlow, options) => {
    const existingFlow = get().getFlowById(nodeId)
    if (!existingFlow) {
      return
    }

    const updatedFlow: Flow = {
      ...existingFlow,
      ...changedFlow,
      data: {
        ...existingFlow.data,
        ...changedFlow.data,
      },
      style: {
        ...existingFlow.style,
        ...changedFlow.style,
      },
      updated_at: new Date(),
    }

    set((state) => {
      state.flowsMap.set(nodeId, updatedFlow)
    })

    try {
      await fileSystemAPI.saveFlowToFile(updatedFlow)
    } catch (ex) {
      console.error(ex)
      set((state) => {
        state.flowsMap.set(nodeId, {
          ...existingFlow,
        })
      })
      options?.onFail?.()
    }
  },

  getFlowById: (id: string) => get().flowsMap.get(id),
})

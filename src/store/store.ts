import { fileSystemAPI } from '@/api/file-system'
import { createFlowDrawerSlice } from '@/store/flow-drawer-slice'
import { createFlowSlice } from '@/store/flow-slice'
import { createNodeSlice } from '@/store/node-slice'
import { StoreType } from '@/store/slice.type'
import { enableMapSet } from 'immer'
import { immer } from 'zustand/middleware/immer'
import { createWithEqualityFn } from 'zustand/traditional'

enableMapSet()

export const useStore = createWithEqualityFn(
  immer<StoreType>((set, get, store) => ({
    ...createFlowSlice(set, get, store),
    ...createNodeSlice(set, get, store),
    ...createFlowDrawerSlice(set, get, store),
    // ...createNodeSlice(...a),
    // ...createEdgeSlice(...a),

    appLoaded: false,
    initialize: async () => {
      set((state) => {
        state.appLoaded = false
      })
      const [loadedFlows, loadedNodes] = await Promise.all([
        fileSystemAPI.loadAllFlows(),
        fileSystemAPI.loadAllNodes(),
      ])

      set((state) => {
        state.flowsMap = new Map(loadedFlows.map((flow) => [flow.flowId, flow]))
        state.nodesMap = new Map(loadedNodes.map((node) => [node.nodeId, node]))

        state.appLoaded = true
      })
    },
  })),
)

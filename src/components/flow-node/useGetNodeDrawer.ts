import { useStore } from '@/store/useStore.ts'
import { NodeType } from '@/types/base-type.ts'

export const useGetNodeDrawer = (nodeId: string, type: NodeType | 'flow') => {
  const store = useStore()

  let parentFlowId = '-1'
  if (type === 'flow') {
    parentFlowId = store.flowStore.getFlowById(nodeId)?.parentFlowId ?? '-1'
  } else {
    parentFlowId = store.nodeStore.getNodeById(nodeId)?.parentFlowId ?? '-1'
  }

  return store.flowStore.getFlowById(parentFlowId)?.drawer
}

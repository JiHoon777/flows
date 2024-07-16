// Save Flow
import {
  BaseDirectory,
  createDir,
  readDir,
  readTextFile,
  removeFile,
  writeTextFile,
} from '@tauri-apps/api/fs'

import { Flow, NodeTypes } from '@/store/types'

const FLOW_DIR = `flows/flow`
const NODE_DIR = `flows/node`

export const fileSystemAPI = {
  checkFlowDirectoryAndCreate: async () => {
    try {
      // FLOW_DIR 존재 여부 확인 및 생성
      await readDir(FLOW_DIR, { dir: BaseDirectory.Document })
    } catch (error) {
      // 디렉토리가 존재하지 않으면 생성
      await createDir(FLOW_DIR, {
        recursive: true,
        dir: BaseDirectory.Document,
      })
    }
  },
  checkNodeDirectoryAndCreaet: async () => {
    try {
      // NODE_DIR 존재 여부 확인 및 생성
      await readDir(NODE_DIR, { dir: BaseDirectory.Document })
    } catch (error) {
      // 디렉토리가 존재하지 않으면 생성
      await createDir(NODE_DIR, {
        recursive: true,
        dir: BaseDirectory.Document,
      })
    }
  },
  saveFlowToFile: async (data: Flow) => {
    const filePath = `${FLOW_DIR}/${data.flowId}.json`

    await createDir(FLOW_DIR, { recursive: true, dir: BaseDirectory.Document })
    await writeTextFile(filePath, JSON.stringify(data), {
      dir: BaseDirectory.Document,
    })
  },
  saveNodeToFile: async (data: NodeTypes) => {
    const filePath = `${NODE_DIR}/${data.nodeId}.json`

    await createDir(NODE_DIR, { recursive: true, dir: BaseDirectory.Document })
    await writeTextFile(filePath, JSON.stringify(data), {
      dir: BaseDirectory.Document,
    })
  },
  loadFlowFromFile: async (flowId: string) => {
    const filePath = `${FLOW_DIR}/${flowId}.json`
    const flowData = await readTextFile(filePath, {
      dir: BaseDirectory.Document,
    })

    return JSON.parse(flowData) as Flow
  },
  loadNodeFromFile: async (nodeId: string) => {
    const filePath = `${NODE_DIR}/${nodeId}.json`
    const nodeData = await readTextFile(filePath, {
      dir: BaseDirectory.Document,
    })

    return JSON.parse(nodeData) as NodeTypes
  },
  loadAllFlows: async () => {
    const files = await readDir(FLOW_DIR, { dir: BaseDirectory.Document })
    const filteredFiles = files.filter((entry) => entry.name !== '.DS_Store')

    return Promise.all(
      filteredFiles.map(async (file) => {
        const flowData = await readTextFile(file.path, {
          dir: BaseDirectory.Document,
        })
        return JSON.parse(flowData) as Flow
      }),
    )
  },
  loadAllNodes: async () => {
    const files = await readDir(NODE_DIR, { dir: BaseDirectory.Document })
    const filteredFiles = files.filter((entry) => entry.name !== '.DS_Store')

    return Promise.all(
      filteredFiles.map(async (file) => {
        const nodeData = await readTextFile(file.path, {
          dir: BaseDirectory.Document,
        })
        return JSON.parse(nodeData) as NodeTypes
      }),
    )
  },
  addFlow: async (data: Flow) => {
    await fileSystemAPI.saveFlowToFile(data)
  },
  deleteFlow: async (flowId: string) => {
    const filePath = `${FLOW_DIR}/${flowId}.json`
    await removeFile(filePath, { dir: BaseDirectory.Document })
  },
  addNode: async (node: NodeTypes) => {
    if (node.parentFlowId) {
      const flow = await fileSystemAPI.loadFlowFromFile(node.parentFlowId)

      if (!flow.childNodeIds) {
        flow.childNodeIds = []
      }
      flow.childNodeIds.push(node.nodeId)
      await fileSystemAPI.saveFlowToFile(flow)
    }
    await fileSystemAPI.saveNodeToFile(node)
  },
  deleteNode: async (nodeId: string) => {
    const node = await fileSystemAPI.loadNodeFromFile(nodeId)
    if (node.parentFlowId) {
      const flow = await fileSystemAPI.loadFlowFromFile(node.parentFlowId)
      flow.childNodeIds = flow.childNodeIds?.filter((id) => id !== nodeId) ?? []
      await fileSystemAPI.saveFlowToFile(flow)
    }
    const filePath = `${NODE_DIR}/${nodeId}.json`
    await removeFile(filePath, { dir: BaseDirectory.Document })
  },
}

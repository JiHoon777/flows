import type { IApiFileSystem } from '@/api/api.interface.ts'
import type { IFlow } from '@/types/flow.type.ts'
import type { NodeTypes } from '@/types/types.ts'

import {
  BaseDirectory,
  createDir,
  readDir,
  readTextFile,
  removeFile,
  writeTextFile,
} from '@tauri-apps/api/fs'

const FLOW_DIR = `flows/flow`
const NODE_DIR = `flows/node`

export class ApiFileSystem implements IApiFileSystem {
  /**
   * Check the flow directory when the app initializes for the first time,
   * and create it if it doesn't exist.
   * @throws {Error}
   */
  async checkFlowDirectoryAndCreate(): Promise<void> {
    try {
      await readDir(FLOW_DIR, { dir: BaseDirectory.Document })
    } catch {
      await createDir(FLOW_DIR, {
        dir: BaseDirectory.Document,
        recursive: true,
      })
    }
  }
  /**
   * Check the node directory when the app initializes for the first time,
   * and create it if it doesn't exist.
   * @throws {Error}
   */
  async checkNodeDirectoryAndCreate(): Promise<void> {
    try {
      await readDir(NODE_DIR, { dir: BaseDirectory.Document })
    } catch {
      await createDir(NODE_DIR, {
        dir: BaseDirectory.Document,
        recursive: true,
      })
    }
  }

  //
  // CRUD Flow
  //
  /**
   * Create a new flow.
   * @param data - The flow data to create
   * @throws {Error}
   */
  async createFlow(data: IFlow): Promise<void> {
    return this.updateFlow(data)
  }
  /**
   * Get a flow by its ID.
   * @param flowId - The ID of the flow to get
   * @throws {Error}
   */
  async getFlow(flowId: string): Promise<IFlow> {
    const filePath = `${FLOW_DIR}/${flowId}.json`

    return this.readJsonFile<IFlow>(filePath)
  }
  /**
   * Update an existing flow.
   * @param data - The flow data to update
   * @throws {Error}
   */
  async updateFlow(
    data: Partial<IFlow> & Pick<IFlow, 'flowId'>,
  ): Promise<void> {
    const filePath = `${FLOW_DIR}/${data.flowId}.json`

    return this.writeJsonFile(filePath, data)
  }
  /**
   * Delete a flow by its ID.
   * @param flowId - The ID of the flow to delete
   * @throws {Error}
   */
  async deleteFlow(flowId: string): Promise<void> {
    const filePath = `${FLOW_DIR}/${flowId}.json`

    const flow = await this.getFlow(flowId)

    if (flow.parentFlowId) {
      const parentFlow = await this.getFlow(flow.parentFlowId)
      parentFlow.childFlowIds =
        parentFlow.childFlowIds?.filter((id) => id !== flowId) ?? []
      await this.updateFlow(parentFlow)
    }

    for (const childFlowId of flow.childFlowIds ?? []) {
      const childFlow = await this.getFlow(childFlowId)
      await this.updateFlow({
        ...childFlow,
        parentFlowId: undefined,
        targets: [],
      })
    }

    for (const childNodeId of flow.childNodeIds ?? []) {
      const childNode = await this.getNode(childNodeId)
      await this.updateNode({
        ...childNode,
        parentFlowId: undefined,
        targets: [],
      })
    }

    return this.deleteJsonFile(filePath)
  }
  /**
   * Get all flows.
   * @throws {Error}
   */
  async getAllFlows(): Promise<IFlow[]> {
    const files = await readDir(FLOW_DIR, { dir: BaseDirectory.Document })
    const filteredFiles = files.filter((entry) => entry.name !== '.DS_Store')

    return Promise.all(
      filteredFiles.map((file) => this.readJsonFile<IFlow>(file.path)),
    )
  }
  //
  // CRUD Node
  //
  /**
   * Create a new node.
   * @param data - The node data to create
   * @throws {Error}
   */
  async createNode(data: NodeTypes): Promise<void> {
    return this.updateNode(data)
  }
  /**
   * Get a node by its ID.
   * @param nodeId - The ID of the node to get
   * @throws {Error}
   */
  async getNode(nodeId: string): Promise<NodeTypes> {
    const filePath = `${NODE_DIR}/${nodeId}.json`
    return this.readJsonFile<NodeTypes>(filePath)
  }
  /**
   * Update an existing node.
   * @param data - The node data to update
   * @throws {Error}
   */
  async updateNode(
    data: Partial<NodeTypes> & Pick<NodeTypes, 'nodeId'>,
  ): Promise<void> {
    const filePath = `${NODE_DIR}/${data.nodeId}.json`
    return this.writeJsonFile(filePath, data)
  }
  /**
   * Delete a node by its ID.
   * @param nodeId - The ID of the node to delete
   * @throws {Error}
   */
  async deleteNode(nodeId: string): Promise<void> {
    const filePath = `${NODE_DIR}/${nodeId}.json`
    const node = await this.getNode(nodeId)
    if (node.parentFlowId) {
      const parentFlow = await this.getFlow(node.parentFlowId)
      parentFlow.childNodeIds =
        parentFlow.childNodeIds?.filter((id) => id !== nodeId) ?? []
      await this.updateFlow(parentFlow)
    }
    return this.deleteJsonFile(filePath)
  }
  /**
   * Get all nodes.
   * @throws {Error}
   */
  async getAllNodes(): Promise<NodeTypes[]> {
    const files = await readDir(NODE_DIR, { dir: BaseDirectory.Document })
    const filteredFiles = files.filter((entry) => entry.name !== '.DS_Store')
    return await Promise.all(
      filteredFiles.map((file) => this.readJsonFile<NodeTypes>(file.path)),
    )
  }

  //
  // Utils
  //
  /**
   * Read a JSON file and parse its contents.
   * @param filePath - The path to the JSON file
   * @throws {Error}
   */
  private async readJsonFile<T>(filePath: string): Promise<T> {
    const content = await readTextFile(filePath, {
      dir: BaseDirectory.Document,
    })
    return JSON.parse(content) as T
  }
  /**
   * Write data to a JSON file.
   * @param filePath - The path to the JSON file
   * @param data - The data to write
   * @throws {Error}
   * */
  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    return writeTextFile(filePath, JSON.stringify(data), {
      dir: BaseDirectory.Document,
    })
  }
  /**
   * Delete a JSON file.
   * @param filePath - The path to the JSON file to delete
   * @throws {Error}
   * */
  private async deleteJsonFile(filePath: string): Promise<void> {
    return removeFile(filePath, { dir: BaseDirectory.Document })
  }
}

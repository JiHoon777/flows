import type { IFlow } from '@/types/flow.type.ts'
import type { NodeTypes } from '@/types/types.ts'

interface IApiCommon {
  //
  // CRUD Flow
  //
  /**
   * Flow 생성
   * @throws {AppError}
   * @returns {Promise<void>}
   */
  createFlow(data: IFlow): Promise<void>
  /**
   * @throws {AppError}
   * @returns {Promise<IFlow>}
   */
  getFlow(flowId: string): Promise<IFlow>
  /**
   * @throws {AppError}
   * @returns {Promise<void>}
   */
  updateFlow(data: Partial<IFlow> & Pick<IFlow, 'flowId'>): Promise<void>
  /**
   * @throws {AppError}
   * @returns {Promise<void>}
   */
  deleteFlow(flowId: string): Promise<void>
  /**
   * @throws {AppError}
   * @returns {Promise<IFlow[]>}
   */
  getAllFlows(): Promise<IFlow[]>

  //
  // CRUD Node
  //
  /**
   * @throws {AppError}
   * @returns {Promise<void>}
   */
  createNode(data: NodeTypes): Promise<void>
  /**
   * @throws {Error}
   * @returns {Promise<NodeTypes>}
   */
  getNode(nodeId: string): Promise<NodeTypes>
  /**
   * @throws {Error}
   * @returns {Promise<void>}
   */
  updateNode(
    data: Partial<NodeTypes> & Pick<NodeTypes, 'nodeId'>,
  ): Promise<void>
  /**
   * @throws {Error}
   * @returns {Promise<void>}
   */
  deleteNode(nodeId: string): Promise<void>
  /**
   * @throws {Error}
   * @returns {Promise<NodeTypes[]>}
   */
  getAllNodes(): Promise<NodeTypes[]>
}

export interface IApiFileSystem extends IApiCommon {
  /**
   * @throws {Error}
   * @returns {Promise<void>}
   */
  checkFlowDirectoryAndCreate(): Promise<void>
  /**
   * @throws {Error}
   * @returns {Promise<void>}
   */
  checkNodeDirectoryAndCreate(): Promise<void>
}

export type Apis = IApiFileSystem

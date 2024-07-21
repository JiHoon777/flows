import { Effect } from 'effect'

import { AppError } from '@/api/error.ts'
import { IFlow } from '@/types/flow.type.ts'
import { NodeTypes } from '@/types/types.ts'

interface IApiCommon {
  //
  // CRUD Flow
  //
  createFlow(data: IFlow): Effect.Effect<void, AppError>
  getFlow(flowId: string): Effect.Effect<IFlow, AppError>
  updateFlow(
    data: Partial<IFlow> & Pick<IFlow, 'flowId'>,
  ): Effect.Effect<void, AppError, never>
  deleteFlow(flowId: string): Effect.Effect<void, AppError>

  getAllFlows(): Effect.Effect<IFlow[], AppError>

  //
  // CRUD Node
  //
  createNode(data: NodeTypes): Effect.Effect<void, AppError>
  getNode(nodeId: string): Effect.Effect<NodeTypes, AppError>
  updateNode(
    data: Partial<NodeTypes> & Pick<NodeTypes, 'nodeId'>,
  ): Effect.Effect<void, AppError>
  deleteNode(nodeId: string): Effect.Effect<void, AppError>

  getAllNodes(): Effect.Effect<NodeTypes[], AppError>
}

export interface IApiFileSystem extends IApiCommon {
  checkFlowDirectoryAndCreate(): Effect.Effect<void, AppError>
  checkNodeDirectoryAndCreate(): Effect.Effect<void, AppError>
}

export type Apis = IApiFileSystem

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
import { Effect, pipe } from 'effect'

import { FileSystemError, handleFileSystemError } from '@/api/error.ts'

const FLOW_DIR = `flows/flow`
const NODE_DIR = `flows/node`

export class ApiFileSystem implements IApiFileSystem {
  //
  // Check the directory when the app initializes for the first time,
  // and create it if it doesn't exist.
  //
  checkFlowDirectoryAndCreate(): Effect.Effect<void, FileSystemError> {
    return pipe(
      Effect.tryPromise(() =>
        readDir(FLOW_DIR, { dir: BaseDirectory.Document }),
      ),
      Effect.catchAll(() =>
        Effect.tryPromise(() =>
          createDir(FLOW_DIR, {
            dir: BaseDirectory.Document,
            recursive: true,
          }),
        ),
      ),
      Effect.catchAll(handleFileSystemError),
    )
  }
  checkNodeDirectoryAndCreate(): Effect.Effect<void, FileSystemError> {
    return pipe(
      Effect.tryPromise(() =>
        readDir(NODE_DIR, { dir: BaseDirectory.Document }),
      ),
      Effect.catchAll(() =>
        Effect.tryPromise(() =>
          createDir(NODE_DIR, {
            dir: BaseDirectory.Document,
            recursive: true,
          }),
        ),
      ),
      Effect.catchAll(handleFileSystemError),
    )
  }

  //
  // CRUD Flow
  //
  createFlow(data: IFlow): Effect.Effect<void, FileSystemError> {
    return this.updateFlow(data)
  }
  getFlow(flowId: string): Effect.Effect<IFlow, FileSystemError> {
    const filePath = `${FLOW_DIR}/${flowId}.json`

    return pipe(
      this.readJsonFile<IFlow>(filePath),
      Effect.catchAll(handleFileSystemError),
    )
  }
  updateFlow(data: Partial<IFlow> & Pick<IFlow, 'flowId'>) {
    const filePath = `${FLOW_DIR}/${data.flowId}.json`

    return pipe(
      this.writeJsonFile(filePath, data),
      Effect.catchAll(handleFileSystemError),
    )
  }
  deleteFlow(flowId: string): Effect.Effect<void, FileSystemError> {
    const filePath = `${FLOW_DIR}/${flowId}.json`

    return pipe(
      this.getFlow(flowId),
      /**
       * 부모 플로우가 있을때 childFlowIds 에서 삭제할 flow 를 제거한다.
       */
      Effect.flatMap((flow) =>
        flow.parentFlowId
          ? pipe(
              this.getFlow(flow.parentFlowId),
              Effect.map((flow) => ({
                ...flow,
                childFlowIds:
                  flow.childFlowIds?.filter((id) => id !== flowId) ?? [],
              })),
              Effect.flatMap((flow) => this.updateFlow(flow)),
              Effect.as(flow),
            )
          : Effect.succeed(flow),
      ),
      /**
       * 자식 플로우, 노드가 있으면 돌면서 parentFlowId 를 제거한다.
       */
      Effect.flatMap((flow) => {
        return pipe(
          Effect.forEach(flow.childFlowIds ?? [], (childFlowId) =>
            pipe(
              this.getFlow(childFlowId),
              Effect.flatMap((childFlow) =>
                this.updateFlow({
                  ...childFlow,
                  parentFlowId: undefined,
                  targets: [],
                }),
              ),
            ),
          ),
          Effect.flatMap(() =>
            Effect.forEach(flow.childNodeIds ?? [], (childNodeId) =>
              pipe(
                this.getNode(childNodeId),
                Effect.flatMap((childNode) =>
                  this.updateNode({
                    ...childNode,
                    parentFlowId: undefined,
                    targets: [],
                  }),
                ),
              ),
            ),
          ),
        )
      }),
      Effect.flatMap(() => this.deleteJsonFile(filePath)),
      Effect.catchAll((e) =>
        e instanceof FileSystemError
          ? Effect.fail(e)
          : handleFileSystemError(e),
      ),
    )
  }

  getAllFlows(): Effect.Effect<IFlow[], FileSystemError> {
    return pipe(
      Effect.tryPromise(() =>
        readDir(FLOW_DIR, { dir: BaseDirectory.Document }),
      ),
      Effect.map((files) =>
        files.filter((entry) => entry.name !== '.DS_Store'),
      ),
      Effect.flatMap((files) =>
        Effect.all(files.map((file) => this.readJsonFile<IFlow>(file.path))),
      ),
      Effect.catchAll(handleFileSystemError),
    )
  }

  //
  // CRUD Node
  //
  createNode(data: NodeTypes): Effect.Effect<void, FileSystemError> {
    return this.updateNode(data)
  }
  getNode(nodeId: string): Effect.Effect<NodeTypes, FileSystemError> {
    const filePath = `${NODE_DIR}/${nodeId}.json`

    return pipe(
      this.readJsonFile<NodeTypes>(filePath),
      Effect.catchAll(handleFileSystemError),
    )
  }
  updateNode(
    data: Partial<NodeTypes> & Pick<NodeTypes, 'nodeId'>,
  ): Effect.Effect<void, FileSystemError> {
    const filePath = `${NODE_DIR}/${data.nodeId}.json`

    return pipe(
      this.writeJsonFile(filePath, data),
      Effect.catchAll(handleFileSystemError),
    )
  }
  deleteNode(nodeId: string): Effect.Effect<void, FileSystemError> {
    const filePath = `${NODE_DIR}/${nodeId}.json`

    return pipe(
      this.getNode(nodeId),
      Effect.flatMap((node) =>
        node.parentFlowId
          ? pipe(
              this.getFlow(node.parentFlowId),
              Effect.map((flow) => ({
                ...flow,
                childNodeIds:
                  flow.childNodeIds?.filter((id) => id !== nodeId) ?? [],
              })),
              Effect.flatMap((flow) => this.updateFlow(flow)),
              Effect.as(node),
            )
          : Effect.succeed(node),
      ),
      Effect.flatMap(() => this.deleteJsonFile(filePath)),
      Effect.catchAll((e) =>
        e instanceof FileSystemError
          ? Effect.fail(e)
          : handleFileSystemError(e),
      ),
    )
  }

  getAllNodes(): Effect.Effect<NodeTypes[], FileSystemError> {
    return pipe(
      Effect.tryPromise(() =>
        readDir(NODE_DIR, { dir: BaseDirectory.Document }),
      ),
      Effect.map((files) =>
        files.filter((entry) => entry.name !== '.DS_Store'),
      ),
      Effect.flatMap((files) =>
        Effect.all(
          files.map((file) => this.readJsonFile<NodeTypes>(file.path)),
        ),
      ),
      Effect.catchAll(handleFileSystemError),
    )
  }

  //
  // Utils
  //
  private readJsonFile<T>(filePath: string) {
    return pipe(
      Effect.tryPromise(() =>
        readTextFile(filePath, { dir: BaseDirectory.Document }),
      ),
      Effect.map(JSON.parse),
      Effect.map((data) => data as T),
    )
  }
  private writeJsonFile<T>(filePath: string, data: T) {
    return Effect.tryPromise(() =>
      writeTextFile(filePath, JSON.stringify(data), {
        dir: BaseDirectory.Document,
      }),
    )
  }
  private deleteJsonFile(filePath: string) {
    return Effect.tryPromise(() =>
      removeFile(filePath, { dir: BaseDirectory.Document }),
    )
  }
}

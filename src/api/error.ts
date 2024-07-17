import { Effect } from 'effect'
import { UnknownException } from 'effect/Cause'

export class FileSystemError extends Error {
  tag = 'file-system'
  originalError: unknown

  constructor(message: string, originalError?: unknown) {
    super(message)
    this.originalError = originalError
  }
}

export class ClientError extends Error {
  tag = 'client'
}

export const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message)
  }

  return String(error)
}

export const handleFileSystemError = (e: UnknownException) => {
  return Effect.fail(new FileSystemError(formatUnknownError(e), e))
}

export type AppError = FileSystemError | ClientError

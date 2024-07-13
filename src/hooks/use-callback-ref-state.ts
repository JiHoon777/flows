import React from 'react'

export const useCallbackRefState = <T>() => {
  const [refValue, setRefValue] = React.useState<T | null>(null)
  const refCallback = React.useCallback(
    (value: T | null) => setRefValue(value),
    [],
  )
  return [refValue, refCallback] as const
}

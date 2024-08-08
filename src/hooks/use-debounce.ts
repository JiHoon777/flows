import { debounce } from 'lodash-es'
import { useEffect, useMemo } from 'react'

type DebouncedFunction<T extends (...args: any) => any> = (
  ...args: Parameters<T>
) => void

export const useDebounce = <T extends (...args: any) => any>(
  callback: T,
  delay: number,
): DebouncedFunction<T> => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay],
  )

  useEffect(() => {
    return () => {
      debouncedCallback.cancel()
    }
  }, [debouncedCallback])

  return debouncedCallback as DebouncedFunction<T>
}

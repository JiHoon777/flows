import type { DependencyList } from 'react'

import { useEffect, useRef } from 'react'

export function useDidUpdate<F extends () => (() => void) | void>(
  effect: F,
  deps: DependencyList,
) {
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }

    return effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

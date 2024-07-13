import { MutableRefObject, useEffect } from 'react'

export const useFocusOnMount = <T extends HTMLElement>(
  ref: MutableRefObject<T | null>,
) => {
  useEffect(() => {
    if (ref.current !== null) {
      ref.current.focus()
    }
  }, [ref])
}

import { RefObject, useEffect } from 'react'

/**
 * @param ref - 감지할 요소의 Ref 객체
 * @param callback - 외부 클릭 시 호출될 콜백 함수
 * @param isRun - outside click 시 callback 을 실행할지 여부
 */
export const useOutsideClick = <T extends HTMLElement>(
  ref: RefObject<T>,
  callback: () => void,
  isRun = true,
) => {
  useEffect(() => {
    if (!isRun) {
      return
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [callback, ref, isRun])
}

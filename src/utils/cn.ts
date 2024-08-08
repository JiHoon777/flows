import type { ClassValue } from 'clsx'

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 여러 개의 className 문자열을 받아 하나로 병합합니다.
 * 동일한 CSS 속성이 중복되는 경우, 뒤에 있는 인자의 스타일이 우선 적용됩니다.
 *
 * 예시: cn('w-200 h-200', 'bg-black')는 'w-200 h-200 bg-black' 을 반환합니다.
 *
 * @param {...ClassValue[]} inputs - 병합할 className 문자열들
 * @returns {string} 병합된 className 문자열
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

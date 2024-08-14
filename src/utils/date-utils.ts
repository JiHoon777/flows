import { format } from 'date-fns'

/**
 *  yyyy-MM-dd
 */
export const formatDateToYYYYMMDD = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy-MM-dd')
}

/**
 *  yyyy.MM.dd.
 */
export const formatDateToYYYYDotMMDotDDDot = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy.MM.dd.')
}

/**
 *  yyyy.MM.dd. (EEEE)
 */
export const formatDateWithFullDayName = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy.MM.dd. (EEEE)')
}

/**
 *  yyyy-MM-dd HH:mm:ss
 */
export const formatDateToyyyyMMddHHmmss = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}

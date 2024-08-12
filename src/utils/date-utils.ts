import { format } from 'date-fns'

export const formatDateToYYYYMMDD = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy-MM-dd')
}

export const formatDateToYYYYDotMMDotDDDot = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy.MM.dd.')
}

export const formatDateWithFullDayName = (_date: Date | string): string => {
  const date = new Date(_date)
  return format(date, 'yyyy.MM.dd. (EEEE)')
}

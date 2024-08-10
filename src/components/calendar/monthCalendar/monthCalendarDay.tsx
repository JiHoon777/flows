import { format, isSameMonth, isToday } from 'date-fns'

import { cn } from '@/utils/cn.ts'

export const MonthCalendarDay = ({
  date,
  currentMonth,
  isSelected,
  onClick,
}: {
  date: Date
  currentMonth: Date
  isSelected: boolean
  onClick: (date: Date) => void
}) => (
  <div
    className={cn(
      'flex cursor-pointer items-center justify-center border border-transparent p-1 text-center',
      !isSameMonth(date, currentMonth) && 'text-gray-400',
      isSelected && 'rounded bg-primary text-primary-foreground',
      isToday(date) && !isSelected && 'rounded border border-primary',
      !isSelected && 'hover:bg-gray-100',
    )}
    onClick={() => onClick(date)}
  >
    {format(date, 'd')}
  </div>
)

import {
  addDays,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import { MonthCalendarDay } from '@/components/calendar/monthCalendar/monthCalendarDay.tsx'

// 달력 그리드 컴포넌트
export const MonthCalendarGrid = ({
  currentDate,
  selectedDate,
  onDateClick,
}: {
  currentDate: Date
  selectedDate: Date
  onDateClick: (date: Date) => void
}) => {
  const monthStart = startOfMonth(currentDate)
  const firstDayOfGrid = startOfWeek(monthStart)
  const lastDayOfGrid = addDays(firstDayOfGrid, 7 * 6 - 1) // Always 6 weeks

  const dateRange = eachDayOfInterval({
    end: lastDayOfGrid,
    start: firstDayOfGrid,
  })

  return (
    <div className="grid grid-cols-7 gap-2">
      {dateRange.map((date) => (
        <MonthCalendarDay
          key={date.toISOString()}
          date={date}
          currentMonth={currentDate}
          isSelected={isSameDay(date, selectedDate)}
          onClick={onDateClick}
        />
      ))}
    </div>
  )
}

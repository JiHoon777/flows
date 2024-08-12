import { addMonths, isSameMonth, startOfMonth } from 'date-fns'
import { type Dispatch, useState } from 'react'

import { MonthCalendarGrid } from '@/components/calendar/monthCalendar/monthCalendarGrid.tsx'
import { MonthCalendarHeader } from '@/components/calendar/monthCalendar/monthCalendarHeader.tsx'
import { MonthCalendarWeekdays } from '@/components/calendar/monthCalendar/monthCalendarWeekdays.tsx'
import { formatDateToYYYYMMDD } from '@/utils/date-utils.ts'

export const MonthCalendar = ({
  selectedDate,
  setSelectedDate,
}: {
  selectedDate: string
  setSelectedDate: Dispatch<string>
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const goToPreviousMonth = () => setCurrentDate((date) => addMonths(date, -1))
  const goToNextMonth = () => setCurrentDate((date) => addMonths(date, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(formatDateToYYYYMMDD(today))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(formatDateToYYYYMMDD(date))
    if (!isSameMonth(date, currentDate)) {
      setCurrentDate(startOfMonth(date))
    }
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-4 p-4">
      <MonthCalendarHeader
        currentDate={currentDate}
        onPrevMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onGoToToday={goToToday}
      />
      <div className={'w-full'}>
        <MonthCalendarWeekdays />
        <MonthCalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
        />
      </div>
    </div>
  )
}

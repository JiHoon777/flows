import { addMonths, isSameMonth, startOfMonth } from 'date-fns'
import { useState } from 'react'

import { MonthCalendarGrid } from '@/components/calendar/monthCalendar/monthCalendarGrid.tsx'
import { MonthCalendarHeader } from '@/components/calendar/monthCalendar/monthCalendarHeader.tsx'
import { MonthCalendarWeekdays } from '@/components/calendar/monthCalendar/monthCalendarWeekdays.tsx'

export const MonthCalendar = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const goToPreviousMonth = () => setCurrentDate((date) => addMonths(date, -1))
  const goToNextMonth = () => setCurrentDate((date) => addMonths(date, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    if (!isSameMonth(date, currentDate)) {
      setCurrentDate(startOfMonth(date))
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 p-4">
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

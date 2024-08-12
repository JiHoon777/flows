import type { Dispatch } from 'react'

import { addDays, subDays } from 'date-fns'
import { useCallback, useEffect, useRef, useState } from 'react'

import { InfiniteScrollCalendarItem } from '@/components/calendar/infiniteScrollCalendar/infiniteScrollCalendarItem.tsx'
import { formatDateToYYYYMMDD } from '@/utils/date-utils.ts'

export const InfiniteScrollCalendar = ({
  selectedDate,
  setSelectedDate,
}: {
  selectedDate: string
  setSelectedDate: Dispatch<string>
}) => {
  const [dates, setDates] = useState<Date[]>(generateInitialDates(selectedDate))
  const containerRef = useRef<HTMLDivElement | null>(null)

  const loadMoreDates = (direction: 'top' | 'bottom'): void => {
    const newDates = [...dates]
    const daysToAdd = 10

    if (direction === 'top') {
      for (let i = 1; i <= daysToAdd; i++) {
        newDates.unshift(subDays(dates[0], i))
      }
    } else {
      for (let i = 1; i <= daysToAdd; i++) {
        newDates.push(addDays(dates[dates.length - 1], i))
      }
    }

    setDates(newDates)
  }

  const handleScroll = (): void => {
    const container = containerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container

    if (scrollTop === 0) {
      loadMoreDates('top')
      container.scrollTop = 100 // Prevent immediate re-trigger
    } else if (scrollHeight - scrollTop === clientHeight) {
      loadMoreDates('bottom')
    }
  }

  // Todo: 지금 동작이 부자연스러울 때가 있는데 이건 추후에 수정하자.
  const scrollToSelectedDate = useCallback((selectedDate: string): void => {
    const container = containerRef.current
    if (!container) return

    const includedSelectedDateElement = container.querySelector(
      `[data-infinite-scroll-calendar-item-date="${formatDateToYYYYMMDD(new Date(selectedDate))}"]`,
    )

    if (includedSelectedDateElement) {
      includedSelectedDateElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    } else {
      const newDates = generateInitialDates(selectedDate)
      setDates(newDates)

      setTimeout(() => {
        const newSelectedDateElement = container.querySelector(
          `[data-infinite-scroll-calendar-item-date="${formatDateToYYYYMMDD(new Date(selectedDate))}"]`,
        )
        if (newSelectedDateElement) {
          newSelectedDateElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      }, 500)
    }
  }, [])

  const handleSelect = useCallback(
    (date: Date) => {
      setSelectedDate(formatDateToYYYYMMDD(date))
    },
    [setSelectedDate],
  )

  useEffect(() => {
    scrollToSelectedDate(selectedDate)
  }, [scrollToSelectedDate, selectedDate])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto scrollbar-hide"
      onScroll={handleScroll}
    >
      {dates.map((date) => (
        <InfiniteScrollCalendarItem
          key={date.toString()}
          date={date}
          isSelected={
            formatDateToYYYYMMDD(date) === formatDateToYYYYMMDD(selectedDate)
          }
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}

function generateInitialDates(date?: string): Date[] {
  const initialDates: Date[] = []
  for (let i = -10; i <= 10; i++) {
    initialDates.push(addDays(date ? date : new Date(), i))
  }
  return initialDates
}

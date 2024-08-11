import { addDays, format, subDays } from 'date-fns'
import { useEffect, useRef, useState, useTransition } from 'react'

import { InfiniteScrollCalendarItem } from '@/components/calendar/infiniteScrollCalendar/infiniteScrollCalendarItem.tsx'

export const InfiniteScrollCalendar = () => {
  const [dates, setDates] = useState<Date[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    generateInitialDates()
  }, [])

  useEffect(() => {
    scrollToSelectedDate()
  }, [selectedDate])

  const generateInitialDates = (date?: Date): void => {
    const initialDates: Date[] = []
    for (let i = -10; i <= 10; i++) {
      initialDates.push(addDays(date ?? new Date(), i))
    }
    setDates(initialDates)
  }

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

  const scrollToSelectedDate = (): void => {
    if (!selectedDate) {
      return
    }

    const container = containerRef.current
    if (!container) return

    const includedSelectedDateElement = container.querySelector(
      `[data-infinite-scroll-calendar-item-date="${format(selectedDate, 'yyyy. M. d.')}"]`,
    )
    if (includedSelectedDateElement) {
      includedSelectedDateElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    } else {
      generateInitialDates(selectedDate)
      startTransition(() => {
        const newSelectedDateElement = container.querySelector(
          '[data-selected="true"]',
        )
        if (newSelectedDateElement) {
          newSelectedDateElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      })
    }
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
            selectedDate
              ? format(date, 'yyyy-MM-dd') ===
                format(selectedDate, 'yyyy-MM-dd')
              : false
          }
          onSelect={() => setSelectedDate(date)}
        />
      ))}
    </div>
  )
}

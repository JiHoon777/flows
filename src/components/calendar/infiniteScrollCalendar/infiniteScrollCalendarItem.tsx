import { format } from 'date-fns'
import { memo, useRef } from 'react'

import { cn } from '@/utils/cn.ts'
import {
  formatDateToYYYYDotMMDotDDDot,
  formatDateToYYYYMMDD,
} from '@/utils/date-utils.ts'

export const InfiniteScrollCalendarItem = memo(
  ({
    date,
    isSelected,
    onSelect,
  }: {
    date: Date
    isSelected: boolean
    onSelect: (date: Date) => void
  }) => {
    const itemRef = useRef<HTMLDivElement | null>(null)
    const dayOfWeek = format(date, 'EEEE')

    return (
      <div
        ref={itemRef}
        className={cn(
          `cursor-pointer border-b p-4`,
          isSelected ? 'bg-accent' : '',
        )}
        onClick={() => onSelect(date)}
        data-infinite-scroll-calendar-item-date={formatDateToYYYYMMDD(date)}
      >
        <div className="font-bold">{formatDateToYYYYDotMMDotDDDot(date)}</div>
        <div>{dayOfWeek}</div>
        {isSelected && (
          <div className="mt-2">
            <button className="rounded bg-gray-200 px-2 py-1">
              + 일정 노트 작성
            </button>
          </div>
        )}
      </div>
    )
  },
)

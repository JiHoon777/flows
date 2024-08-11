import { format } from 'date-fns'

import { cn } from '@/utils/cn.ts'

export const InfiniteScrollCalendarItem = ({
  date,
  isSelected,
  onSelect,
}: {
  date: Date
  isSelected: boolean
  onSelect: () => void
}) => {
  const dayOfWeek = format(date, 'EEEE')

  return (
    <div
      className={cn(
        `cursor-pointer border-b p-4`,
        isSelected ? 'bg-accent' : '',
      )}
      onClick={onSelect}
      data-infinite-scroll-calendar-item-date={format(date, 'yyyy. M. d.')}
    >
      <div className="font-bold">{format(date, 'yyyy. M. d.')}</div>
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
}

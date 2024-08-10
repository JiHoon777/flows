import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, CircleDot } from 'lucide-react'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { Button } from '@/components/ui/button.tsx'

// 헤더 컴포넌트
export const MonthCalendarHeader = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
}: {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToToday: () => void
}) => (
  <div className="flex items-center justify-between">
    <Button size={'xs'} variant={'ghost'}>
      <ChevronLeft className="h-4 w-4 cursor-pointer" onClick={onPrevMonth} />
    </Button>
    <div className={'relative flex items-center gap-4'}>
      <span className="text-base font-semibold">
        {format(currentDate, 'yyyy. M')}
      </span>
      <ButtonWithTooltip
        tooltipContent={'오늘'}
        variant={'ghost'}
        size={'xs'}
        className={'absolute -right-8'}
        onClick={onGoToToday}
      >
        <CircleDot className={'h-4 w-4'} />
      </ButtonWithTooltip>
    </div>
    <Button size={'xs'} variant={'ghost'}>
      <ChevronRight className="h-4 w-4 cursor-pointer" onClick={onNextMonth} />
    </Button>
  </div>
)

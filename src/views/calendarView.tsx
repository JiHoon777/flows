import type { DoNode } from '@/store/node/do-node.ts'

import { format } from 'date-fns'
import { observer } from 'mobx-react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { InfiniteScrollCalendar } from '@/components/calendar/infiniteScrollCalendar'
import { MonthCalendar } from '@/components/calendar/monthCalendar'
import { useStore } from '@/store/useStore.ts'

const FORMAT_TO_DISPLAY = 'MMM d, yyyy (EEEE)'
const FORMAT_TO_SAVE = 'yyyy-MM-dd'
const CURRENT_DATE_PARAM_NAME = 'currentDate'

export const CalendarView = observer(() => {
  const store = useStore()
  const [searchParams, setSearchParams] = useSearchParams({
    [CURRENT_DATE_PARAM_NAME]: format(new Date(), FORMAT_TO_SAVE),
  })

  const currentDateFromParam = searchParams.get(CURRENT_DATE_PARAM_NAME)
  const currentDate = format(currentDateFromParam ?? new Date(), FORMAT_TO_SAVE)
  const currentDateToDisplay = format(currentDate, FORMAT_TO_DISPLAY)

  const handleCurrentDate = useCallback(
    (changedDate: string) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams)
        newParams.set(CURRENT_DATE_PARAM_NAME, changedDate)
        return newParams
      })
    },
    [setSearchParams],
  )

  const currentNode: DoNode | null = store.nodeStore.getNodeById('')
  return (
    <main className={'h-full w-full overflow-y-hidden'}>
      <div className={'flex h-full w-full'}>
        <section
          className={
            'flex h-full w-full max-w-xs flex-col border-r border-border'
          }
        >
          <MonthCalendar
            selectedDate={currentDate}
            setSelectedDate={handleCurrentDate}
          />
          <InfiniteScrollCalendar
            selectedDate={currentDate}
            setSelectedDate={handleCurrentDate}
          />
        </section>
        <section
          className={
            'mx-auto flex w-full max-w-screen-lg gap-3 overflow-x-hidden overflow-y-hidden pt-10'
          }
        >
          <h1 className={'text-4xl font-bold'}>{currentDateToDisplay}</h1>
          {/*<NodeDetailView node={} />*/}
        </section>
      </div>
    </main>
  )
})

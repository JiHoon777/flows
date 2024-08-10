import type { DoNode } from '@/store/node/do-node.ts'

import { format, isValid } from 'date-fns'
import { observer } from 'mobx-react'
import { useSearchParams } from 'react-router-dom'

import { useStore } from '@/store/useStore.ts'
import { MonthCalendar } from '@/components/calendar/monthCalendar/monthCalendar.tsx'

const FORMAT_TO_DISPLAY = 'MMM d, yyyy (EEEE)'
const FORMAT_TO_SAVE = 'yyyy-MM-dd'
const CURRENT_DATE_PARAM_NAME = 'currentDate'

export const CalendarView = observer(() => {
  const store = useStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentDateFromParam = searchParams.get(CURRENT_DATE_PARAM_NAME)
  const today = new Date()
  const currentDate = format(currentDateFromParam ?? today, FORMAT_TO_SAVE)
  const validCurrentDate = isValid(currentDate) ? currentDate : today

  const currentDateToDisplay = format(validCurrentDate, FORMAT_TO_DISPLAY)

  const currentNode: DoNode | null = store.nodeStore.getNodeById('')
  return (
    <main className={'h-screen w-full'}>
      <div className={'flex h-full w-full'}>
        <section className={'h-full w-full max-w-xs border-r border-border'}>
          <MonthCalendar />
        </section>
        <section
          className={
            'mx-auto flex h-full w-full max-w-screen-lg gap-3 overflow-y-auto overflow-x-hidden pt-10'
          }
        >
          <h1 className={'text-4xl font-bold'}>{currentDateToDisplay}</h1>
          {/*<NodeDetailView node={} />*/}
        </section>
      </div>
    </main>
  )
})

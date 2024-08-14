import type { DoNode } from '@/store/node/do-node.ts'
import type { INoteNode } from '@/types/note-node.type.ts'

import { observer } from 'mobx-react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { InfiniteScrollCalendar } from '@/components/calendar/infiniteScrollCalendar'
import { MonthCalendar } from '@/components/calendar/monthCalendar'
import { LexicalEditor } from '@/components/lexical/lexical-editor.tsx'
import { useStore } from '@/store/useStore.ts'
import {
  formatDateToYYYYMMDD,
  formatDateWithFullDayName,
} from '@/utils/date-utils.ts'
import { cn } from '@/utils/cn.ts'

const CURRENT_DATE_PARAM_NAME = 'currentDate'

export const CalendarView = observer(() => {
  const store = useStore()
  const viewModel = store.calendarView
  const [searchParams, setSearchParams] = useSearchParams({
    [CURRENT_DATE_PARAM_NAME]: formatDateToYYYYMMDD(new Date()),
  })

  // get currentDate from search param
  const currentDateFromParam = searchParams.get(CURRENT_DATE_PARAM_NAME)
  const currentDate = formatDateToYYYYMMDD(currentDateFromParam ?? new Date())
  const currentDateToDisplay = formatDateWithFullDayName(currentDate)

  // get daily date node from currentDate
  const currentNode: DoNode | null = store.nodeStore.getNodeById(currentDate)

  const handleChangeCurrentDate = useCallback(
    (changedDate: string) => {
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams)
        newParams.set(CURRENT_DATE_PARAM_NAME, changedDate)
        return newParams
      })
    },
    [setSearchParams],
  )

  const handleCurrentDateNodeChange = useCallback(
    (content: string) => {
      if (!currentNode) {
        viewModel.createDailyDateNode(content, currentDate)
        return
      }

      viewModel.changeDailyDateNodeContent(currentNode.id, content)
    },
    [currentDate, currentNode, viewModel],
  )

  console.log(viewModel.datesOfDailyDateNodes)

  const initialEditorState =
    (currentNode?.snapshot as INoteNode)?.content ?? null
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
            setSelectedDate={handleChangeCurrentDate}
          />
          <InfiniteScrollCalendar
            selectedDate={currentDate}
            setSelectedDate={handleChangeCurrentDate}
          />
        </section>
        <section
          className={cn(
            'mx-auto my-10 flex w-full max-w-screen-lg flex-col',
            'gap-6 overflow-y-auto overflow-x-hidden px-10 scrollbar-hide',
            'rounded-lg py-10 shadow-accent-foreground',
          )}
        >
          <h1 className={'text-4xl font-bold'}>{currentDateToDisplay}</h1>
          <LexicalEditor
            initialEditorState={initialEditorState}
            onChange={handleCurrentDateNodeChange}
          />
        </section>
      </div>
    </main>
  )
})

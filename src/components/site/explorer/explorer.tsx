import {
  Bookmark,
  CalendarDays,
  FileText,
  House,
  Inbox,
  Map,
} from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate } from 'react-router-dom'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { ExplorerFlowRow } from '@/components/site/explorer/explorer-flow-row.tsx'
import { ExplorerNodeRow } from '@/components/site/explorer/explorer-node-row.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'

export const Explorer = observer(() => {
  const store = useStore()
  const navigate = useNavigate()
  // const location = useLocation()

  const explorerList = store.explorerView.explorerList
  return (
    <div className={'flex w-full flex-col gap-4 px-2 pt-4'}>
      {/*<ExplorerToolbar />*/}
      <section className={'flex w-full flex-col'}>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'Home 으로 가기'}
          onClick={() => navigate('/home')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <House className={'h-4 w-4'} />
            <span>홈</span>
          </div>
        </ButtonWithTooltip>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'플로우 전체 보기로 가기'}
          onClick={() => navigate('/flows')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <Map className={'h-4 w-4'} />
            <span>플로우 전체 보기</span>
          </div>
        </ButtonWithTooltip>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'문서 전체 보기로 가기'}
          onClick={() => navigate('/documents')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <FileText className={'h-4 w-4'} />
            <span>문서 전체 보기</span>
          </div>
        </ButtonWithTooltip>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'달력으로 가기'}
          onClick={() => navigate('/calendar')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <CalendarDays className={'h-4 w-4'} />
            <span>달력</span>
          </div>
        </ButtonWithTooltip>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'즐겨찾기로 가기'}
          onClick={() => navigate('/bookmarks')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <Bookmark className={'h-4 w-4'} />
            <span>즐겨찾기</span>
          </div>
        </ButtonWithTooltip>
        <ButtonWithTooltip
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={'인박스로 가기'}
          onClick={() => navigate('/inbox')}
        >
          <div className={'flex w-full items-center gap-2 text-foreground'}>
            <Inbox className={'h-4 w-4 shrink-0'} />
            <span>Inbox</span>
          </div>
        </ButtonWithTooltip>
      </section>
      <section className={'flex w-full flex-col gap-1.5'}>
        <div className={'pl-2 text-sm'}>플로우</div>
        {explorerList.map((flow) =>
          flow instanceof DoFlow ? (
            <ExplorerFlowRow key={flow.id} flow={flow} />
          ) : (
            <ExplorerNodeRow key={flow.id} node={flow} />
          ),
        )}
      </section>
    </div>
  )
})

import {
  Bookmark,
  CalendarDays,
  FileText,
  House,
  Inbox,
  Map,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { appPathnames } from '@/hooks/useAppRoutes.tsx'
import { cn } from '@/utils/cn.ts'

const cns = {
  active: cn('bg-accent text-accent-foreground'),
  icon: cn('h-4 w-4 shrink-0'),
  wrap: cn('flex justify-start gap-2'),
}

export const ExplorerMainNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <section className={'flex w-full flex-col'}>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'Home 으로 가기'}
        onClick={() => navigate(appPathnames.home)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.home && cns.active,
        )}
      >
        <House className={cns.icon} />
        <span>홈</span>
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'플로우 전체 보기로 가기'}
        onClick={() => navigate(appPathnames.flows)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.flows && cns.active,
        )}
      >
        <Map className={cns.icon} />
        <span>플로우 전체 보기</span>
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'문서 전체 보기로 가기'}
        onClick={() => navigate(appPathnames.documents)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.documents && cns.active,
        )}
      >
        <FileText className={cns.icon} />
        <span>문서 전체 보기</span>
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'달력으로 가기'}
        onClick={() => navigate(appPathnames.calendar)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.calendar && cns.active,
        )}
      >
        <CalendarDays className={cns.icon} />
        <span>달력</span>
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'즐겨찾기로 가기'}
        onClick={() => navigate(appPathnames.bookmarks)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.bookmarks && cns.active,
        )}
      >
        <Bookmark className={cns.icon} />
        <span>즐겨찾기</span>
      </ButtonWithTooltip>
      <ButtonWithTooltip
        variant={'ghost'}
        side={'bottom'}
        tooltipContent={'인박스로 가기'}
        onClick={() => navigate(appPathnames.inbox)}
        className={cn(
          cns.wrap,
          location.pathname === appPathnames.inbox && cns.active,
        )}
      >
        <Inbox className={cns.icon} />
        <span>Inbox</span>
      </ButtonWithTooltip>
    </section>
  )
}

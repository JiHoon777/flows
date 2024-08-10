import type { ReactNode } from 'react'

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
  icon: cn('h-4 w-4 shrink-0'),
}

export const ExplorerMainNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const mainNavigations: {
    icon: ReactNode
    pathname: string
    text: string
    tooltipContent: string
  }[] = [
    {
      icon: <House className={cns.icon} />,
      pathname: appPathnames.home,
      text: '홈',
      tooltipContent: '홈으로 가기',
    },
    {
      icon: <Map className={cns.icon} />,
      pathname: appPathnames.flows,
      text: '플로우 전체 보기',
      tooltipContent: '플로우 전체 보기로 가기',
    },
    {
      icon: <FileText className={cns.icon} />,
      pathname: appPathnames.documents,
      text: '문서 전체 보기',
      tooltipContent: '문서 전체 보기로 가기',
    },
    {
      icon: <CalendarDays className={cns.icon} />,
      pathname: appPathnames.calendar,
      text: '달력',
      tooltipContent: '달력으로 가기',
    },
    {
      icon: <Bookmark className={cns.icon} />,
      pathname: appPathnames.bookmarks,
      text: '즐겨찾기',
      tooltipContent: '즐겨찾기로 가기',
    },
    {
      icon: <Inbox className={cns.icon} />,
      pathname: appPathnames.inbox,
      text: '인박스',
      tooltipContent: '인박스로 가기',
    },
  ]

  return (
    <section className={'flex w-full flex-col'}>
      {mainNavigations.map((navigation) => (
        <ButtonWithTooltip
          key={navigation.pathname}
          variant={'ghost'}
          side={'bottom'}
          tooltipContent={navigation.tooltipContent}
          onClick={() => navigate(navigation.pathname)}
          className={cn(
            'flex justify-start gap-2',
            location.pathname === navigation.pathname &&
              'bg-accent text-accent-foreground',
          )}
        >
          {navigation.icon}
          <span>{navigation.text}</span>
        </ButtonWithTooltip>
      ))}
    </section>
  )
}

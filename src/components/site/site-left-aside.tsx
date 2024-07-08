import { ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/utils/cn'
import { Map } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export const SiteLeftAside = () => {
  const { pathname } = useLocation()

  return (
    <aside
      className={
        'h-screen z-10 w-10 flex-col border-r bg-background flex pt-10'
      }
    >
      <nav className={'flex flex-col items-center gap-4 px-2 sm:py-4'}>
        {navMenus.map((item) => (
          <Tooltip key={item.pathname}>
            <TooltipTrigger asChild>
              <Link
                to={item.pathname}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  pathname === item.pathname
                    ? 'text-foreground'
                    : 'text-foreground/60',
                )}
              >
                {item.icon}
                <span className={'sr-only'}>{item.desc}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side={'right'}>{item.desc}</TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  )
}

const navMenus: {
  pathname: '/flows'
  // | '/calendar' | '/tags'
  icon: ReactNode
  desc: string
}[] = [
  {
    pathname: '/flows',
    icon: <Map />,
    desc: 'Graphs',
  },
  // {
  //   pathname: '/calendar',
  //   icon: <Calendar />,
  //   desc: 'Calendar',
  // },
  // {
  //   pathname: '/tags',
  //   icon: <Tag />,
  //   desc: 'Tags',
  // },
]

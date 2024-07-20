import {
  ArrowUpNarrowWide,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  MoonStar,
  Sun,
} from 'lucide-react'
import { observer } from 'mobx-react'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { TooltipWrap } from '@/components/ui/tooltip.tsx'
import { useTheme } from '@/contexts/theme-provider.tsx'
import { useStore } from '@/store/useStore.ts'
import { ExplorerSortOption } from '@/store/views/explorer-view.ts'
import { cn } from '@/utils/cn.ts'

const cns = {
  container: cn('flex w-full items-center justify-center'),
  icon: cn('h-[1.1rem] w-[1.1rem] text-gray-500'),
  dropdownMenuItem: cn('relative pl-7 text-sm text-gray-500'),
  dropdownMenuItemIcon: cn('absolute left-2 top-2 h-4 w-4'),
}

export const ExplorerToolbar = observer(() => {
  const store = useStore()
  const { theme, setTheme } = useTheme()
  const explorerView = store.explorerView

  return (
    <div className={cns.container}>
      <ButtonWithTooltip
        variant={'ghost'}
        size={'icon'}
        side={'bottom'}
        tooltipContent={'Add Flow'}
        onClick={() => explorerView.createFlowOnRoot()}
      >
        <FolderPlus className={cns.icon} />
      </ButtonWithTooltip>
      <TooltipWrap side={'bottom'} content={'Change Sort Order'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={'ghost'} size={'icon'} asChild>
              <div>
                <ArrowUpNarrowWide className={cns.icon} />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.values(ExplorerSortOption).map((item) => (
              <DropdownMenuItem
                key={item}
                onClick={() => explorerView.setSortOption(item)}
                className={cns.dropdownMenuItem}
              >
                {explorerView.sortOption === item && (
                  <Check className={cns.dropdownMenuItemIcon} />
                )}
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipWrap>
      <ButtonWithTooltip
        variant={'ghost'}
        size={'icon'}
        side={'bottom'}
        onClick={() => explorerView.toggleIsExpandAll()}
        tooltipContent={
          explorerView.isExpandAll ? 'Collapse All' : 'Expand All'
        }
      >
        {explorerView.isExpandAll && <ChevronsDownUp className={cns.icon} />}
        {!explorerView.isExpandAll && <ChevronsUpDown className={cns.icon} />}
      </ButtonWithTooltip>
      <ButtonWithTooltip
        side={'bottom'}
        tooltipContent={theme === 'light' ? 'Light theme' : 'Dark theme'}
        variant={'ghost'}
        size={'icon'}
        onClick={() =>
          theme === 'light' ? setTheme('dark') : setTheme('light')
        }
      >
        {theme === 'light' && <Sun className={cns.icon} />}
        {theme === 'dark' && <MoonStar className={cns.icon} />}
      </ButtonWithTooltip>
    </div>
  )
})

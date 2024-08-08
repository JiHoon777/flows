import type { MenuRef } from '@/components/menu/menu.tsx'

import {
  ArrowUpNarrowWide,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  MoonStar,
  Sun,
} from 'lucide-react'
import { observer } from 'mobx-react'
import { useRef } from 'react'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { Menu } from '@/components/menu/menu.tsx'
import { useCreateMenuModel } from '@/components/menu/use-create-menu-model.ts'
import { Button } from '@/components/ui/button.tsx'
import { TooltipWrap } from '@/components/ui/tooltip.tsx'
import { useTheme } from '@/contexts/theme-provider.tsx'
import { useStore } from '@/store/useStore.ts'
import { ExplorerSortOption } from '@/store/views/explorer-view.ts'
import { cn } from '@/utils/cn.ts'

const cns = {
  container: cn('flex w-full items-center justify-center'),
  icon: cn('h-[1.1rem] w-[1.1rem] text-gray-500'),
}

export const ExplorerToolbar = observer(() => {
  const store = useStore()
  const { theme, setTheme } = useTheme()
  const sortingMenuRef = useRef<MenuRef | null>(null)

  const explorerView = store.explorerView

  const dropdownMenuModel = useCreateMenuModel(
    () =>
      Object.values(ExplorerSortOption).map((item) => ({
        checked: explorerView.sortOption === item,
        command: () => explorerView.setSortOption(item),
        label: item,
      })),
    [explorerView.sortOption],
  )

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
        <Button
          variant={'ghost'}
          size={'icon'}
          asChild
          onClick={(e) => sortingMenuRef.current?.show(e)}
        >
          <div>
            <ArrowUpNarrowWide className={cns.icon} />
          </div>
        </Button>
        <Menu
          ref={sortingMenuRef}
          model={dropdownMenuModel}
          variant={'dropdown'}
        />
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

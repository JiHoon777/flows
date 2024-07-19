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

const IconCn = 'w-[1.1rem] h-[1.1rem] text-gray-500'

export const ExplorerToolbar = observer(() => {
  const store = useStore()
  const { theme, setTheme } = useTheme()
  const explorerView = store.explorerView

  return (
    <div className={'w-full flex items-center justify-center'}>
      <TooltipWrap side={'bottom'} content={'Add Flow'} asChild>
        <Button
          variant={'ghost'}
          size={'icon'}
          onClick={() => explorerView.createFlowOnRoot()}
        >
          <FolderPlus className={IconCn} />
        </Button>
      </TooltipWrap>
      <TooltipWrap side={'bottom'} content={'Change Sort Order'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={'ghost'} size={'icon'} asChild>
              <div>
                <ArrowUpNarrowWide className={IconCn} />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.values(ExplorerSortOption).map((item) => (
              <DropdownMenuItem
                key={item}
                onClick={() => explorerView.setSortOption(item)}
                className={'relative text-gray-500 text-sm pl-7'}
              >
                {explorerView.sortOption === item && (
                  <Check className={'w-4 h-4 absolute top-2 left-2'} />
                )}
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipWrap>
      <TooltipWrap
        side={'bottom'}
        content={explorerView.isExpandAll ? 'Collapse All' : 'Expand All'}
        asChild
      >
        <Button
          variant={'ghost'}
          size={'icon'}
          onClick={() => explorerView.toggleIsExpandAll()}
        >
          {explorerView.isExpandAll && <ChevronsDownUp className={IconCn} />}
          {!explorerView.isExpandAll && <ChevronsUpDown className={IconCn} />}
        </Button>
      </TooltipWrap>
      <TooltipWrap
        side={'bottom'}
        content={theme === 'light' ? 'Light theme' : 'Dark theme'}
        asChild
      >
        <Button
          variant={'ghost'}
          size={'icon'}
          onClick={() =>
            theme === 'light' ? setTheme('dark') : setTheme('light')
          }
        >
          {theme === 'light' && <Sun className={IconCn} />}
          {theme === 'dark' && <MoonStar className={IconCn} />}
        </Button>
      </TooltipWrap>
    </div>
  )
})

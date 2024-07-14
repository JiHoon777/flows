import {
  ArrowUpNarrowWide,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
} from 'lucide-react'
import { observer } from 'mobx-react'

import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { useStore } from '@/store/useStore.ts'
import { ExplorerSortOption } from '@/store/views/explorer-view.ts'

const IconCn = 'w-[1.1rem] h-[1.1rem] text-gray-500'

export const ExplorerToolbar = observer(() => {
  const store = useStore()
  const explorerView = store.explorerView

  return (
    <div className={'w-full flex items-center justify-center'}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={'ghost'}
            size={'icon'}
            onClick={() => explorerView.createFlowOnRoot()}
          >
            <FolderPlus className={IconCn} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={'bottom'}>Add Flow</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger>
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
        </TooltipTrigger>
        <TooltipContent side={'bottom'}>Change Sort Order</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={'ghost'}
            size={'icon'}
            onClick={() => explorerView.toggleIsExpandAll()}
          >
            {explorerView.isExpandAll && <ChevronsDownUp className={IconCn} />}
            {!explorerView.isExpandAll && <ChevronsUpDown className={IconCn} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={'bottom'}>
          {explorerView.isExpandAll && 'Collapse All'}
          {!explorerView.isExpandAll && 'Expand All'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

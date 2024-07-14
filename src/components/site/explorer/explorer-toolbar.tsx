import { JSX, useMemo, useState } from 'react'

import {
  ArrowUpNarrowWide,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
} from 'lucide-react'
import { observer } from 'mobx-react'

import { Button } from '@/components/ui/button.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { useToast } from '@/components/ui/use-toast.ts'
import { useStore } from '@/store/useStore.ts'

const IconCn = 'w-[1.1rem] h-[1.1rem] text-gray-500'

export const ExplorerToolbar = observer(() => {
  const store = useStore()
  const { toast } = useToast()
  const [isExpandAll, setIsExpandAll] = useState(false)

  const actionButtons: {
    icon: JSX.Element
    action: () => void
    tooltipContent: string
  }[] = useMemo(() => {
    return [
      {
        icon: <FolderPlus className={IconCn} />,
        action: () => store.explorerView.createFlowOnRoot(),
        tooltipContent: 'Add Flow',
      },
      {
        icon: <ArrowUpNarrowWide className={IconCn} />,
        action: () => {
          toast({
            variant: 'destructive',
            title: '구현 대기중',
          })
        },
        tooltipContent: 'Change Sort Order',
      },
      isExpandAll
        ? {
            icon: <ChevronsDownUp className={IconCn} />,
            action: () => {
              toast({
                variant: 'destructive',
                title: '구현 대기중',
              })
            },
            tooltipContent: 'Collapse All',
          }
        : {
            icon: <ChevronsUpDown className={IconCn} />,
            action: () => {
              toast({
                variant: 'destructive',
                title: '구현 대기중',
              })
            },
            tooltipContent: 'Expand All',
          },
    ]
  }, [isExpandAll])

  return (
    <div className={'w-full flex items-center justify-center'}>
      {actionButtons.map((button) => (
        <Tooltip key={button.tooltipContent}>
          <TooltipTrigger asChild>
            <Button variant={'ghost'} size={'icon'} onClick={button.action}>
              {button.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={'bottom'}>
            {button.tooltipContent}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
})

import { Dispatch, useState } from 'react'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu.tsx'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { cn } from '@/utils/cn.ts'

export const ExplorerNodeRowItem = observer(
  ({
    flow,
    isChildOpen,
    setIsChildOpen,
  }: {
    flow: DoFlow
    isChildOpen: boolean
    setIsChildOpen: Dispatch<boolean>
  }) => {
    const navigate = useNavigate()
    const { flowId } = useParams<{ flowId?: string }>()

    const [isNameEditing, setIsNameEditing] = useState(false)

    const isViewing = flow.id === flowId
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'site-left-explorer-row',
              isViewing && 'site-left-explorer-selected-row',
            )}
            onClick={() => navigate(`/flows/${flow.id}`)}
          >
            <motion.div
              initial={false}
              animate={{ rotate: !isChildOpen ? 0 : 90 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight
                className={'w-4 h-4 text-gray-500'}
                onClick={() => setIsChildOpen((p) => !p)}
              />
            </motion.div>
            <span className={'text-sm'}>
              {flow.title ?? '-'} {isViewing && '👀'}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsNameEditing(true)}>
            Rename ...
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  },
)

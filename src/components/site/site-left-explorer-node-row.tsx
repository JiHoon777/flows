import { memo } from 'react'

import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { NodeTypes } from '@/store/types'
import { cn } from '@/utils/cn'

export const SiteLeftExplorerNodeRow = memo(({ node }: { node: NodeTypes }) => {
  const navigate = useNavigate()
  const { nodeId } = useParams<{ nodeId?: string }>()

  const isViewing = node.nodeId === nodeId
  const title = node.data.title
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.05 }}
      className={cn(
        'site-left-explorer-row',
        isViewing && 'site-left-explorer-selected-row',
      )}
      onClick={() => navigate(`/nodes/${node.nodeId}`)}
    >
      <span className={'text-sm'}>{title}</span>
      <Badge variant={'outline'} className={'py-0.5 px-2'}>
        node
      </Badge>
    </motion.div>
  )
})

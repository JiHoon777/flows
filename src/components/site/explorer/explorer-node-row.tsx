import { motion } from 'framer-motion'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { DoNode } from '@/store/node/do-node.ts'
import { cn } from '@/utils/cn.ts'

export const ExplorerNodeRow = observer(({ node }: { node: DoNode }) => {
  const navigate = useNavigate()
  const { nodeId } = useParams<{ nodeId?: string }>()

  const isViewing = node.id === nodeId
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
      onClick={() => navigate(`/nodes/${node.id}`)}
    >
      <span className={'max-w-full truncate text-sm'}>{node.title}</span>
      {isViewing && <span className={'absolute -right-4'}>👀</span>}
    </motion.div>
  )
})

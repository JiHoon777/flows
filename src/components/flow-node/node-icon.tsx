import { Map, NotebookPen, Type } from 'lucide-react'

import { NodeType } from '@/types/base.type.ts'

export const NodeIcon = ({ type }: { type: NodeType | 'flow' }) => {
  return (
    <div className={'absolute -top-5 text-xs text-gray-500'}>
      {type === 'flow' && <Map className={'h-4 w-4'} />}
      {type === 'note' && <NotebookPen className={'h-4 w-4'} />}
      {type === 'text' && <Type className={'h-4 w-4'} />}
    </div>
  )
}

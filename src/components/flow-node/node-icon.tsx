import { Map, NotebookPen, Type } from 'lucide-react'

import { NodeType } from '@/types/base-type.ts'

export const NodeIcon = ({ type }: { type: NodeType | 'flow' }) => {
  return (
    <div className={'absolute -top-5 text-gray-500 text-xs'}>
      {type === 'flow' && <Map className={'w-4 h-4'} />}
      {type === 'note' && <NotebookPen className={'w-4 h-4'} />}
      {type === 'text' && <Type className={'w-4 h-4'} />}
    </div>
  )
}

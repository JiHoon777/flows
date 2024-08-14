//
// Note Node
//
import type { INodeBase } from '@/types/base.type.ts'

export interface INoteNode extends INodeBase {
  type: 'note'
  title: string
  content?: string
  dailyDate?: string // 'yyyy-MM-dd' 형식의 날짜 문자열, 있으면 daily Note 로 판별한다.
}

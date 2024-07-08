import { ReactNode } from 'react'

type Props<T> = {
  each: T[]
  children: (item: T, index: number) => ReactNode
}

export const For = <T,>({ each, children }: Props<T>) => {
  return (
    <>
      {each.map((item, index) => {
        return children(item, index)
      })}
    </>
  )
}

import { ReactNode } from 'react'

type MapFunction<T, MT> = (item: T) => MT

type Props<T, MT = T> = {
  each: T[]
  map?: MapFunction<T, MT>
  children: (item: MT extends T ? T : MT, index: number) => ReactNode
}

export const For = <T, MT = T>({ each, map, children }: Props<T, MT>) => {
  return (
    <>
      {each.map((item, index) => {
        if (map) {
          const mappedItem = map(item)
          return mappedItem
            ? children(mappedItem as MT extends T ? T : MT, index)
            : null
        }

        return children(item as MT extends T ? T : MT, index)
      })}
    </>
  )
}

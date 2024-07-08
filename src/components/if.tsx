import { PropsWithChildren } from 'react'

type Props = {
  is: boolean
} & PropsWithChildren

export const If = ({ is, children }: Props) => {
  return is ? <>{children}</> : null
}

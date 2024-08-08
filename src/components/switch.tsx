import type { ReactElement, ReactNode } from 'react'

import { Children, isValidElement } from 'react'

type SwitchProps = {
  children:
    | ReactElement<CaseProps | DefaultProps>
    | ReactElement<CaseProps | DefaultProps>[]
  is: string
}

const SwitchRoot = ({ children, is }: SwitchProps) => {
  const validChildren = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<CaseProps | DefaultProps>[]

  const caseChild = validChildren.find((child) => {
    const asChild = child as ReactElement<CaseProps>
    return child.type === Case && typeof asChild.props.is === 'string'
      ? asChild.props.is === is
      : asChild.props.is.includes(is)
  })

  const defaultChild = validChildren.find((child) => child.type === Default)

  return <>{caseChild ?? defaultChild ?? null}</>
}

type CaseProps = {
  is: string | string[]
  children: ReactNode
}

const Case = ({ children }: CaseProps) => {
  return <>{children}</>
}

type DefaultProps = {
  children: ReactNode
}

const Default = ({ children }: DefaultProps) => {
  return <>{children}</>
}

export const Switch = Object.assign(SwitchRoot, {
  Case,
  Default,
})

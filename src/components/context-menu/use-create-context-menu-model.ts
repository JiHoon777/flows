import { DependencyList, useMemo } from 'react'

import { ContextMenuModel } from '@/components/context-menu/context-menu.tsx'

export const useCreateContextMenuModel = (
  menuModel: () => ContextMenuModel,
  deps: DependencyList = [],
): ContextMenuModel => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(menuModel, [...deps])
}

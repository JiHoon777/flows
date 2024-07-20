import { DependencyList, useMemo } from 'react'

import { ContextMenuModel } from '@/components/menu/menu.tsx'

export const useCreateMenuModel = (
  menuModel: () => ContextMenuModel,
  deps: DependencyList = [],
): ContextMenuModel => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(menuModel, [...deps])
}

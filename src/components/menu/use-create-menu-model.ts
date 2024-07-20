import { DependencyList, useMemo } from 'react'

import { MenuModel } from '@/components/menu/menu.tsx'

export const useCreateMenuModel = (
  menuModel: () => MenuModel,
  deps: DependencyList = [],
): MenuModel => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(menuModel, [...deps])
}

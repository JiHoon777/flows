import type { MenuModel } from '@/components/menu/menu.tsx'
import type { DependencyList } from 'react'

import { useMemo } from 'react'

export const useCreateMenuModel = (
  menuModel: () => MenuModel,
  deps: DependencyList = [],
): MenuModel => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(menuModel, [...deps])
}

import { Columns2, MoonStar, Sun } from 'lucide-react'

import { ButtonWithTooltip } from '@/components/button-with-tooltip.tsx'
import { useTheme } from '@/contexts/theme-provider.tsx'

export const SiteHeader = ({
  showExplorer,
  toggleShowExplorer,
}: {
  showExplorer: boolean
  toggleShowExplorer: () => void
}) => {
  const { theme, setTheme } = useTheme()

  return (
    <div
      data-tauri-drag-region="true"
      className={'flex h-[46px] w-full items-center pl-[80px] shadow'}
    >
      <ButtonWithTooltip
        variant={'ghost'}
        size={'icon'}
        side={'bottom'}
        tooltipContent={showExplorer ? '익스플로러 접기' : '익스플로러 펼치기'}
        onClick={toggleShowExplorer}
      >
        <Columns2 className={'h-4 w-4 text-gray-500'} />
      </ButtonWithTooltip>
      <ButtonWithTooltip
        side={'bottom'}
        tooltipContent={theme === 'light' ? '어둡게 하기' : '밝게 하기'}
        variant={'ghost'}
        size={'icon'}
        onClick={() =>
          theme === 'light' ? setTheme('dark') : setTheme('light')
        }
      >
        {theme === 'light' && <Sun className={'h-4 w-4 text-gray-500'} />}
        {theme === 'dark' && <MoonStar className={'h-4 w-4 text-gray-500'} />}
      </ButtonWithTooltip>
    </div>
  )
}

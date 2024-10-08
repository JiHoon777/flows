import type { ComponentPickerOption } from '@/components/lexical/plugins/component-picker-menu-plugin/component-picker-option.ts'

import { cn } from '@/utils/cn.ts'

export const ComponentPickerMenuItem = ({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  option: ComponentPickerOption
}) => {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 px-2 py-0.5 hover:bg-primary-foreground',
        isSelected && 'bg-primary-foreground',
      )}
      ref={option.setRefElement}
      aria-selected={isSelected}
      id={`typeahead-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {option.icon}
      <span className={'text-sm font-medium'}>{option.title}</span>
    </li>
  )
}

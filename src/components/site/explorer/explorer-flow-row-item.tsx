import {
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react'

import { Effect } from 'effect'
import { motion } from 'framer-motion'
import { debounce } from 'lodash-es'
import { ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react'
import { useNavigate, useParams } from 'react-router-dom'

import { AlertModal } from '@/components/alert-modal.tsx'
import { Menu, MenuModel, MenuRef } from '@/components/menu/menu.tsx'
import { Input } from '@/components/ui/input.tsx'
import { useOverlay } from '@/contexts/overlay/use-overlay.tsx'
import { useOutsideClick } from '@/hooks/use-outside-click.ts'
import { DoFlow } from '@/store/flow/do-flow.ts'
import { useStore } from '@/store/useStore.ts'
import { cn } from '@/utils/cn.ts'

export const ExplorerFlowRowItem = observer(
  ({
    flow,
    isChildOpen,
    setIsChildOpen,
  }: {
    flow: DoFlow
    isChildOpen: boolean
    setIsChildOpen: Dispatch<SetStateAction<boolean>>
  }) => {
    const store = useStore()
    const navigate = useNavigate()
    const { open } = useOverlay()
    const { flowId } = useParams<{ flowId?: string }>()
    const contextMenuRef = useRef<MenuRef | null>(null)

    const [isNameEditing, setIsNameEditing] = useState(false)
    const inputRef = useRef<HTMLInputElement | null>(null)
    useOutsideClick(inputRef, () => {
      setIsNameEditing(false)
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleChangeName = useCallback(
      debounce((e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value || !e.target.value.trim()) {
          return
        }

        Effect.runPromise(
          flow.store.updateFlow({
            flowId: flow.id,
            changedFlow: {
              data: {
                title: e.target.value,
              },
            },
          }),
        ).catch(store.showError)
      }, 500),
      [],
    )

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setIsNameEditing(false)
        inputRef.current = null
      }
    }

    const openDelete = () => {
      open(({ isOpen, exit }) => (
        <AlertModal
          isOpen={isOpen}
          onClose={exit}
          onFinish={() =>
            Effect.runPromise(store.flowStore.removeFlow(flow.id)).catch(
              store.showError,
            )
          }
        />
      ))
    }

    const contextmenuModel: MenuModel = [
      {
        label: 'Rename ...',
        command: () => {
          setIsNameEditing(true)

          setTimeout(() => {
            inputRef.current?.focus()
          }, 300)
        },
      },
      {
        label: 'Delete ...',
        command: openDelete,
      },
    ]

    const isViewing = flow.id === flowId
    return (
      <div
        className={cn(
          'site-left-explorer-row',
          isViewing && 'site-left-explorer-selected-row',
        )}
        onClick={() => navigate(`/flows/${flow.id}`)}
        onContextMenu={(e) => contextMenuRef.current?.show(e)}
      >
        <motion.div
          initial={false}
          animate={{ rotate: !isChildOpen ? 0 : 90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight
            className={'h-4 w-4 text-gray-500'}
            onClick={() => setIsChildOpen((p) => !p)}
          />
        </motion.div>

        <Input
          ref={inputRef}
          defaultValue={flow.title}
          className={cn('h-5 pl-1', !isNameEditing && 'hidden')}
          onChange={handleChangeName}
          onKeyDown={handleKeyDown}
        />
        <span
          className={cn(
            'max-w-full truncate text-sm',
            isNameEditing && 'hidden',
          )}
        >
          {flow.title ?? '-'}
        </span>
        {isViewing && <span className={'absolute -right-4'}>👀</span>}
        <Menu ref={contextMenuRef} model={contextmenuModel} />
      </div>
    )
  },
)

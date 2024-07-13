import { JSX, PropsWithChildren } from 'react'

import { cva, VariantProps } from 'class-variance-authority'
import { AnimatePresence, motion as m } from 'framer-motion'

import { Portal } from '@/components/portal.tsx'
import { cn } from '@/utils/cn.ts'

const modalVariants = cva('w-full rounded-xl p-10 bg-background shadow-lg', {
  variants: {
    size: {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '7xl': 'max-w-7xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

interface ModalOverlayProps
  extends VariantProps<typeof modalVariants>,
    PropsWithChildren {}

export function ModalOverlay({
  size,
  children,
}: ModalOverlayProps): JSX.Element {
  return (
    <Portal>
      <AnimatePresence mode="wait">
        <m.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <m.div
            animate={{ opacity: 1, scale: 1 }}
            className={cn(modalVariants({ size }))}
            exit={{ opacity: 0, scale: 0.1 }}
            initial={{ opacity: 0, scale: 0.1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </m.div>
        </m.div>
      </AnimatePresence>
    </Portal>
  )
}

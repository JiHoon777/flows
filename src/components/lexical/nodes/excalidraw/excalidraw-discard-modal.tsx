import { ModalOverlay } from '@/components/modal-overlay.tsx'
import { Button } from '@/components/ui/button.tsx'

export const ExcalidrawDiscardModal = ({
  isOpen,
  onClose,
  discard,
}: {
  isOpen: boolean
  onClose: () => void
  discard: () => void
}) => {
  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      Are you sure you want to discard the changes?
      <div className={'w-full flex justify-end gap-4'}>
        <Button variant={'destructive'} onClick={discard}>
          Discard
        </Button>
        <Button variant={'outline'} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </ModalOverlay>
  )
}

import { ModalOverlay, ModalOverlayProps } from '@/components/modal-overlay.tsx'
import { Button } from '@/components/ui/button.tsx'

export const AlertModal = ({
  onFinish,
  ...props
}: ModalOverlayProps & { onFinish: () => void }) => {
  return (
    <ModalOverlay {...props} className={'flex flex-col p-6 gap-6'}>
      <p>Are you sure?</p>
      <div className={'w-full flex justify-end gap-4'}>
        <Button variant={'outline'} onClick={props.onClose}>
          Cancel
        </Button>
        <Button variant={'destructive'} onClick={onFinish}>
          Continue
        </Button>
      </div>
    </ModalOverlay>
  )
}

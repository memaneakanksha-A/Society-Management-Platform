import Modal from "@/components/common/Modal";
import RecordPaymentForm from "./RecordPaymentForm";

interface Props {
  open: boolean;
  initialHouseId?: string;
  initialDueIds?: string[];
  onClose: () => void;
}

export default function RecordPaymentModal({ open, initialHouseId, initialDueIds, onClose }: Props) {
  return (
    <Modal open={open} title="Record Payment" onClose={onClose} wide>
      <RecordPaymentForm initialHouseId={initialHouseId} initialDueIds={initialDueIds} onDone={onClose} />
    </Modal>
  );
}
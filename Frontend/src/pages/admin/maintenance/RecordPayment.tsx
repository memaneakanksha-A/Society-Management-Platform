import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RecordPaymentForm from "@/components/maintenance/RecordPaymentForm";

export default function RecordPayment() {
  const [params] = useSearchParams();
  const houseId = params.get("houseId") || undefined;
  const dueId = params.get("dueId") || undefined;
  const kindParam = params.get("kind");
  const kind = kindParam === "share" ? "share" : kindParam === "other" ? "other" : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Record Payment" subtitle="Record a maintenance, share or other payment and generate a receipt." />
      <Card>
        <RecordPaymentForm
          initialHouseId={houseId}
          initialDueIds={dueId ? [dueId] : undefined}
          initialKind={kind}
        />
      </Card>
    </div>
  );
}
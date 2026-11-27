import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import { createExpense, updateExpense, createExpenseCategory } from "@/api/expense.api";
import type { Expense, ExpenseCategory, PaymentMode } from "@/types/finance.types";
import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface Props {
  open: boolean;
  categories: ExpenseCategory[];
  editing?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

const modeOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const todayStr = (): string => new Date().toISOString().split("T")[0];

export default function ExpenseFormModal({ open, categories, editing, onClose, onSaved }: Props) {
  const [date, setDate] = useState(todayStr());
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [billNo, setBillNo] = useState("");
  const [description, setDescription] = useState("");
  const [isPetty, setIsPetty] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [localCats, setLocalCats] = useState<ExpenseCategory[]>(categories);

  useEffect(() => setLocalCats(categories), [categories]);

  const pettyCatId = useMemo(
    () => localCats.find((c) => c.name.toLowerCase() === "petty cash")?._id,
    [localCats]
  );

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date ? editing.date.split("T")[0] : todayStr());
      setCategoryId(typeof editing.categoryId === "object" ? editing.categoryId?._id || "" : editing.categoryId);
      setTitle(editing.title || "");
      setPaidTo(editing.paidTo || "");
      setAmount(String(editing.amount ?? ""));
      setMode(editing.paymentMode);
      setReferenceNo(editing.referenceNo || "");
      setBillNo(editing.billNo || "");
      setDescription(editing.description || "");
      setIsPetty(editing.isPettyCash);
    } else {
      setDate(todayStr());
      setCategoryId("");
      setTitle("");
      setPaidTo("");
      setAmount("");
      setMode("cash");
      setReferenceNo("");
      setBillNo("");
      setDescription("");
      setIsPetty(false);
    }
    setFile(null);
    setShowNewCat(false);
    setNewCatName("");
  }, [open, editing]);

  const handleTogglePetty = (on: boolean) => {
    setIsPetty(on);
    if (on && pettyCatId) setCategoryId(pettyCatId);
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }
    setAddingCat(true);
    try {
      const created = await createExpenseCategory({ name });
      setLocalCats((prev) => [...prev, created]);
      setCategoryId(created._id);
      setShowNewCat(false);
      setNewCatName("");
      toast.success("Category added");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAddingCat(false);
    }
  };

  const referenceLabel =
    mode === "upi" || mode === "bank_transfer"
      ? "Transaction ID / UTR"
      : mode === "cheque"
      ? "Cheque No"
      : "Reference No";
  const showReference = mode === "upi" || mode === "bank_transfer" || mode === "cheque";

  const canSave =
    !!title.trim() &&
    (Number(amount) || 0) > 0 &&
    (isPetty || !!categoryId) &&
    (mode !== "upi" && mode !== "bank_transfer" ? true : !!referenceNo.trim()) &&
    (mode !== "cheque" ? true : !!referenceNo.trim());

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("date", date);
      if (!isPetty && categoryId) fd.append("categoryId", categoryId);
      fd.append("title", title.trim());
      if (paidTo.trim()) fd.append("paidTo", paidTo.trim());
      fd.append("amount", String(Number(amount)));
      fd.append("paymentMode", mode);
      if (showReference && referenceNo.trim()) fd.append("referenceNo", referenceNo.trim());
      if (!isPetty && billNo.trim()) fd.append("billNo", billNo.trim());
      fd.append("isPettyCash", String(isPetty));
      if (!isPetty && description.trim()) fd.append("description", description.trim());
      if (file) fd.append("attachment", file);

      if (editing) await updateExpense(editing._id, fd);
      else await createExpense(fd);

      toast.success(editing ? "Expense updated" : "Expense added");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? "Edit Expense" : "Add Expense"}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={saving || !canSave} leftIcon="save">
            {editing ? "Save" : "Add Expense"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Small / petty expense</p>
            <p className="text-xs text-slate-500">Quick entry, category auto-set to Petty Cash</p>
          </div>
          <button
            type="button"
            onClick={() => handleTogglePetty(!isPetty)}
            className={`relative h-6 w-11 rounded-full transition-colors ${isPetty ? "bg-indigo-600" : "bg-slate-300"}`}
            aria-pressed={isPetty}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isPetty ? "left-5" : "left-0.5"}`}
            />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {!isPetty && (
            <div>
              <Select
                label="Category *"
                placeholder="Select category"
                options={localCats.map((c) => ({ value: c._id, label: c.name }))}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewCat((v) => !v)}
                className="mt-1 text-xs text-indigo-600 hover:underline"
              >
                {showNewCat ? "Cancel" : "+ new category"}
              </button>
              {showNewCat && (
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <Button size="sm" onClick={handleAddCategory} loading={addingCat} disabled={addingCat}>
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Electricity bill" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Paid To" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Vendor / person" />
          <Input label="Amount (₹) *" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Mode *" options={modeOptions} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} />
          {showReference && (
            <Input label={`${referenceLabel} *`} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
          )}
          {!isPetty && (
            <Input label="Bill No" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
          )}
        </div>

        {!isPetty && (
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional notes"
          />
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Attachment (bill photo / PDF)</label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? file.name : "Choose file"}
          </label>
        </div>
      </div>
    </Modal>
  );
}
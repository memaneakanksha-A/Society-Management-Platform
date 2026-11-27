import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/api/axios";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "@/api/expense.api";
import type { ExpenseCategory } from "@/types/finance.types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/DataTable";
import Loader from "@/components/common/Loader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Badge from "@/components/common/Badge";

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await getExpenseCategories());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    try {
      await createExpenseCategory({ name });
      toast.success("Category added");
      setNewName("");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c: ExpenseCategory) => {
    setEditingId(c._id);
    setEditingName(c.name);
  };

  const handleRename = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await updateExpenseCategory(editingId, { name });
      toast.success("Category renamed");
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: ExpenseCategory) => {
    try {
      await updateExpenseCategory(c._id, { isActive: !c.isActive });
      toast.success(c.isActive ? "Category deactivated" : "Category activated");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteExpenseCategory(deleteTarget._id);
      toast.success("Category deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        render: (row: ExpenseCategory) =>
          editingId === row._id ? (
            <div className="flex items-center gap-2">
              <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
              <Button size="sm" onClick={handleRename} loading={saving} disabled={saving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <span className="font-medium text-slate-900">{row.name}</span>
          ),
      },
      {
        key: "default",
        header: "Type",
        width: "110px",
        render: (row: ExpenseCategory) =>
          row.isDefault ? <Badge variant="indigo">Default</Badge> : <span className="text-slate-400">Custom</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "110px",
        render: (row: ExpenseCategory) => (
          <Badge variant={row.isActive ? "green" : "gray"}>{row.isActive ? "Active" : "Inactive"}</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        width: "260px",
        render: (row: ExpenseCategory) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>
              Rename
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(row)}>
              {row.isActive ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [editingId, editingName, saving]
  );

  return (
    <div>
      <PageHeader title="Expense Categories" subtitle="Manage the categories used to classify expenses" />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="New category"
            placeholder="e.g., Parking"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            leftIcon="plus"
          />
          <Button onClick={handleAdd} loading={adding} disabled={adding}>
            Add Category
          </Button>
        </div>
      </Card>

      {loading && categories.length === 0 ? (
        <Loader />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          keyExtractor={(row) => row._id}
          loading={loading}
          emptyMessage="No categories yet. Add one above."
          emptyIcon="list"
          striped
          hoverable
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete category "${deleteTarget?.name}"? Categories used by expenses cannot be deleted.`}
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
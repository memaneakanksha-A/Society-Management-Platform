import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { changePasswordApi } from "@/api/auth.api";
import { getErrorMessage } from "@/api/member.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ChangePasswordForm({ onSuccess, onCancel }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Current Password"
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        leftIcon="lock"
        fullWidth
        autoComplete="current-password"
      />
      <Input
        label="New Password"
        type="password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        leftIcon="lock"
        fullWidth
        autoComplete="new-password"
      />
      <Input
        label="Confirm New Password"
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        leftIcon="lock"
        fullWidth
        autoComplete="new-password"
      />
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading} disabled={loading} leftIcon="save">
          Update Password
        </Button>
      </div>
    </form>
  );
}
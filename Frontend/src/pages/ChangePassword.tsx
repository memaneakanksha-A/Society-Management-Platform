import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/ProtectedRoute";
import ChangePasswordForm from "@/components/member/ChangePasswordForm";
import { Icon } from "@/components/ui/icons";

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = () => {
    refreshUser({ mustChangePassword: false });
    navigate(user ? homeForRole(user.role) : "/member", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <Icon name="lock" size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Change your password</h1>
            <p className="text-sm text-slate-500">
              You must set a new password before continuing.
            </p>
          </div>
        </div>
        <ChangePasswordForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
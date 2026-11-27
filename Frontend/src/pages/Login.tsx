import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/routes/ProtectedRoute";
import { getErrorMessage } from "@/api/axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/icons";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(identifier, password);
      toast.success(`Welcome, ${u.name}`);
      if (u.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate(homeForRole(u.role), { replace: true });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Icon name="building" size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Society Platform</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <Input
            label="Email or mobile number"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin@society.com or 9876543210"
            leftIcon="mail"
            fullWidth
            autoComplete="username"
          />

          <div className="mt-4">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              leftIcon="lock"
              rightIcon={showPassword ? "eyeOff" : "eye"}
              fullWidth
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.nativeEvent.getModifierState("Control")) {
                  setShowPassword(!showPassword);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            className="mt-6"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Demo: admin@society.com / password
          </p>
        </form>
      </div>
    </div>
  );
}
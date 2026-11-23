import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api, authService } from "@/lib/api";
import Seo from "@/seo/Seo";

type AuthMode = "login" | "forgot" | "reset_code";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(
    () => searchParams.get("reason") === "session_expired"
  );

  // Remove ?reason=session_expired from browser URL so subsequent page reloads stay clean
  useEffect(() => {
    if (searchParams.get("reason") === "session_expired") {
      navigate("/admin_login", { replace: true });
    }
  }, [searchParams, navigate]);

  // Show/hide password states (eye icon)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form states - Login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Form states - Forgot / Reset Password (SMTP)
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Clear messages when switching modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSessionExpiredNotice(false);
  };

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSessionExpiredNotice(false);
    setLoading(true);

    try {
      const res = await api.loginAdmin({
        username: loginUsername.trim(),
        password: loginPassword,
      });

      authService.saveSession(res.access_token, res.user);
      navigate("/admin_dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Forgot Password (Sends OTP via SMTP)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setSuccessMsg(`Verification code sent to ${res.email || forgotEmail} via SMTP. Please check your email inbox.`);
      setResetCode(""); // Never prefill OTP - user must check their registered email inbox
      setMode("reset_code");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not send verification code via SMTP. Please check your registered email or server configuration.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Reset Password (Verify OTP & Set New Password)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });

      setSuccessMsg(res.message || "Password reset successfully!");
      setTimeout(() => {
        setLoginUsername(forgotEmail);
        setLoginPassword("");
        switchMode("login");
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#2D222A]">
      <Seo title="Admin Login | KuttyStory" noindex={true} />

      {/* Main Form Container Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-gray-100/90 space-y-6">
          {/* Brand Header Inside Card */}
          <div className="text-center pt-1 pb-1">
            <Link to="/" className="inline-flex items-center justify-center gap-3 group mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-gray-100 p-1 flex items-center justify-center shadow-sm shadow-[#C98A84]/15 group-hover:scale-105 transition-transform overflow-hidden">
                <img src="/logo.png" alt="Kutty Story Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-3xl font-extrabold tracking-tight text-[#C98A84]">
                Kutty Story
              </span>
            </Link>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight mt-1">
              {mode === "login" && "Admin Dashboard Sign In"}
              {mode === "forgot" && "Forgot Password"}
              {mode === "reset_code" && "Set New Password"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {mode === "login" && ""}
              {mode === "forgot" && "We'll send a 6-digit verification code to your email."}
              {mode === "reset_code" && "Enter the verification code and your new password."}
            </p>
          </div>

          {/* Notification Alerts */}
          {sessionExpiredNotice && !errorMsg && mode === "login" && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>Your admin session expired due to inactivity. Please sign in again.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {/* Username / Email */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="admin@kuttystory.com or username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] text-xs transition"
                  />
                </div>
              </div>

              {/* Password with Eye Icon */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[11px] font-semibold text-[#C98A84] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] text-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-[#C98A84]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
              </button>
            </form>
          )}

          {/* 2. FORGOT PASSWORD (SMTP) */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@kuttystory.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] text-xs transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  An SMTP verification code will be dispatched to this address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? "Sending Code via SMTP..." : "Send Verification Code"}</span>
              </button>

              <div className="text-center pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. VERIFY CODE & SET NEW PASSWORD (RESET) */}
          {mode === "reset_code" && (
            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 tracking-widest font-mono text-center text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] text-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-[#C98A84]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] text-xs transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-0.5"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-[#C98A84]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? "Updating Password..." : "Set New Password"}</span>
              </button>

              <div className="text-center pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>

        
      </div>
    </div>
  );
}

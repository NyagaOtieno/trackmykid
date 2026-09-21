import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { verifyFirstLoginOtp, resendFirstLoginOtp } from "./api";

// POST /api/auth/first-login/verify-otp — body {otp, newPassword} — completes
// first-time setup. POST /api/auth/first-login/resend-otp — resend if missed.
// This page is intentionally OUTSIDE <ProtectedRoute>: Login.tsx stores the
// token here but deliberately does not set isAuthenticated=true until this
// step succeeds, so the user can't skip straight to a portal mid-setup.
export default function FirstLoginVerify() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // No token at all means they never actually logged in — bounce to login
  // rather than showing a form that can't possibly work.
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!token || isAuthenticated) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyFirstLoginOtp({ otp, newPassword });

      // Some backends return a refreshed token/user on this step, some
      // just a success flag — handle both without assuming either.
      if (result?.token) localStorage.setItem("token", result.token);
      const user = result?.user || JSON.parse(localStorage.getItem("user") || "null");
      if (result?.user) localStorage.setItem("user", JSON.stringify(result.user));

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("loginTime", String(Date.now()));
      toast.success("Password set — welcome!");

      switch (user?.role) {
        case "PARENT":
          navigate("/parent-portal");
          break;
        case "DRIVER":
          navigate("/driver-portal");
          break;
        case "ASSISTANT":
          navigate("/assistant-portal");
          break;
        case "ADMIN":
          navigate("/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Invalid or expired OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendFirstLoginOtp();
      toast.success("A new OTP has been sent.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            🔐 Confirm Your Account
          </CardTitle>
          <CardDescription className="text-center">
            Enter the OTP we sent you and choose a new password to finish setting up your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                One-Time Password (OTP)
              </label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="Enter the code you received"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2 relative">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Confirm & Continue"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? "Resending..." : "Didn't get a code? Resend OTP"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

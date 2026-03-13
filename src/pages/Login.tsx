import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import api from "@/api/axiosConfig";
import { clearSession, getSession, saveSession } from "@/lib/auth";

type Step = "login" | "forgotPhone" | "resetPassword";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const didInit = useRef(false);
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOTPSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const canLogin = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password]
  );

  // ✅ If already logged in, go resolve mode -> correct UI
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const session = getSession();
    if (session?.user?.role) {
      navigate("/resolve", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!canLogin) return;

  setIsLoading(true);
  try {
    const response = await api.post("/auth/login", { email, password });

    // ✅ token can be in body OR headers depending on backend
    const data = response.data || {};

    const token =
      data.token ||
      data.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken ||
      response.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
      response.headers?.["x-access-token"] ||
      response.headers?.["x-auth-token"];

    // ✅ user might be in body as "user" or directly returned object
    const user = data.user || data?.data?.user || (data?.id ? data : null);

    if (!token) {
      // show what we got (helps debugging)
      console.error("Login response has no token:", { data, headers: response.headers });
      throw new Error("Login succeeded but no token was returned by the API.");
    }

    if (!user) throw new Error("Login response missing user object.");

    saveSession(String(token), user);

    toast.success(`Welcome back, ${user?.name || "User"}!`);

    const from = (location.state as any)?.from as string | undefined;
    navigate("/resolve", { replace: true, state: { from } });
  } catch (err: any) {
    clearSession();
    toast.error(err?.message || err?.response?.data?.message || "Login failed");
  } finally {
    setIsLoading(false);
  }
};


  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error("Enter phone number");

    setIsLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { phone });
      if (!res.data?.success) return toast.error(res.data?.message || "Failed to send OTP");

      toast.success(res.data.message || "OTP sent");
      setStep("resetPassword");
      setOTPSent(true);
      setResendTimer(600);

      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      otpTimerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
            setOTPSent(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim()) return toast.error("Enter OTP");
    if (!newPassword.trim()) return toast.error("Enter new password");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    setIsLoading(true);
    try {
      const res = await api.post("/auth/reset-password", { phone, otp, newPassword });
      if (!res.data?.success) return toast.error(res.data?.message || "Reset failed");

      toast.success("Password reset successful");
      setStep("login");
      setPhone("");
      setOTP("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Track Anywhere</CardTitle>
          <CardDescription className="text-center">Sign in to continue</CardDescription>
        </CardHeader>

        <CardContent>
          {step === "login" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-2.5 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-blue-600"
                  onClick={() => setStep("forgotPhone")}
                >
                  Forgot password?
                </button>
              </div>

              <Button className="w-full" disabled={isLoading || !canLogin}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          )}

          {step === "forgotPhone" && (
            <form onSubmit={handleSendOTP} className="space-y-3">
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Button className="w-full" disabled={isLoading || otpSent}>
                {otpSent ? `Resend in ${resendTimer}s` : "Send OTP"}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setStep("login")}
              >
                Back to login
              </button>
            </form>
          )}

          {step === "resetPassword" && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <Input placeholder="OTP" value={otp} onChange={(e) => setOTP(e.target.value)} />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setStep("login")}
              >
                Back to login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
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
import api from "@/api/axiosConfig";
import { Eye, EyeOff } from "lucide-react";

// Backend endpoint
const AUTH_URL = "/auth/login";

export default function Login() {
  const navigate = useNavigate();
  const otpTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Login state =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ===== Forgot password flow =====
  const [step, setStep] = useState<"login" | "forgotPhone" | "resetPassword">("login");
  const [phone, setPhone] = useState("");
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOTPSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // ===== Redirect if already logged in =====
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (token && isAuthenticated) {
      switch (user.role) {
        case "ADMIN":
          navigate("/dashboard");
          break;
        case "PARENT":
          navigate("/parent-portal");
          break;
        case "DRIVER":
          navigate("/driver-portal");
          break;
        case "ASSISTANT":
          navigate("/assistant-portal");
          break;
        default:
          localStorage.clear();
      }
    }
  }, [navigate]);

  // ===== Cleanup timer on unmount =====
  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  // ===== Login =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post(AUTH_URL, { email, password });
      const { token, user } = response.data;

      if (!token || !user) throw new Error("Invalid login response");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");

      toast.success(`Welcome back, ${user.name || "User"}`);

      switch (user.role) {
        case "ADMIN":
          navigate("/dashboard");
          break;
        case "PARENT":
          navigate("/parent-portal");
          break;
        case "DRIVER":
          navigate("/driver-portal");
          break;
        case "ASSISTANT":
          navigate("/assistant-portal");
          break;
        default:
          throw new Error("Unauthorized role");
      }
    } catch (err: any) {
      localStorage.clear();
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Send OTP =====
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return toast.error("Enter phone number");

    setIsLoading(true);

    try {
      const res =await api.post("/auth/forgot-password", { phone });


      if (!res.data?.success) {
        return toast.error(res.data?.message || "Failed to send OTP");
      }

      toast.success(res.data.message);
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

  // ===== Reset Password =====
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (!otp) {
      return toast.error("Enter OTP");
    }

    setIsLoading(true);

    try {
      const res = await api.post("/auth/reset-password", {
  phone,
  otp,
  newPassword,
});


      if (!res.data?.success) {
        return toast.error(res.data?.message || "Reset failed");
      }

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
          <CardTitle className="text-2xl font-bold text-center">
            SchoolTrack Transport
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the system
          </CardDescription>
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
                  onClick={() => setShowPassword(!showPassword)}
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

              <Button className="w-full" disabled={isLoading}>
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
              <Button className="w-full">Send OTP</Button>
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
              <Button className="w-full">Reset password</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

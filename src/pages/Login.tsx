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
import api from "./api";
import { Eye, EyeOff } from "lucide-react";

// Backend endpoints (baseURL already handled by api)
const AUTH_URL = "/auth/login";
const FORGOT_URL = "/auth/forgot-password";

export default function Login() {
  const navigate = useNavigate();

  // Login identifier can be either email or phone
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password remains email-based
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Check whether the login value is an email
  const isEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAuthenticated =
      localStorage.getItem("isAuthenticated") === "true";

    if (token && isAuthenticated) {
      // Redirect based on role
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
          navigate("/");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginValue = identifier.trim();

    if (!loginValue) {
      toast.error("Please enter your email or phone number.");
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      // Send exactly what the user entered.
      // Backend supports both email and phone.
      const loginData = isEmail(loginValue)
        ? {
            email: loginValue,
            password,
          }
        : {
            phone: loginValue,
            password,
          };

      // Login via api instance
      const response = await api.post(AUTH_URL, loginData);

      const {
        token,
        user,
        mustChangePassword,
        isFirstLogin,
        otpSent,
      } = response.data || {};

      if (!token) {
        throw new Error("Invalid login response from server");
      }

      // First-time login:
      // Backend wants OTP verification and/or a new password
      // before the session is fully authenticated.
      if (mustChangePassword || isFirstLogin) {
        localStorage.setItem("token", token);

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        toast.info(
          otpSent
            ? "First-time login — enter the OTP we just sent you to set a new password."
            : "First-time login — you need to set a new password to continue."
        );

        navigate("/first-login");
        return;
      }

      if (!user) {
        throw new Error("Invalid login response from server");
      }

      // Save session
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");

      toast.success(`Welcome back, ${user.name || "User"}!`);

      // Redirect based on role
      switch (user.role) {
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
          toast.error(
            "You are not authorized to access the admin dashboard."
          );

          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("isAuthenticated");

          navigate("/");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");

      toast.error(
        error.response?.data?.message ||
          "Login failed. Check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    try {
      await api.post(FORGOT_URL, {
        email: forgotEmail.trim(),
      });

      toast.success("Password reset link sent to your email.");

      setIsForgotOpen(false);
      setForgotEmail("");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send reset link."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            🎓 SchoolTrack Transport
          </CardTitle>

          <CardDescription className="text-center">
            Enter your email or phone number to access the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Phone */}
            <div className="space-y-2">
              <label
                htmlFor="identifier"
                className="text-sm font-medium"
              >
                Email or Phone Number
              </label>

              <Input
                id="identifier"
                type="text"
                placeholder="Email or 0113935450"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2 relative">
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-500"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setIsForgotOpen(true)}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Forgot Password Modal */}
          {isForgotOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 shadow-lg w-[90%] max-w-sm">
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Reset Password
                </h2>

                <p className="text-sm text-gray-500 mb-4 text-center">
                  Enter your email to receive a password reset link.
                </p>

                <form
                  onSubmit={handleForgotPassword}
                  className="space-y-3"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />

                  <div className="flex gap-2">
                    <Button type="submit" className="w-full">
                      Send Link
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsForgotOpen(false);
                        setForgotEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

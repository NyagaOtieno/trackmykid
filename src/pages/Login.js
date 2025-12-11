import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/api/axiosConfig";
import { Eye, EyeOff } from "lucide-react";
// ✅ Backend endpoints (baseURL already handled by api)
const AUTH_URL = "/auth/login";
const FORGOT_URL = "/auth/forgot-password";
export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    // ✅ Redirect if already authenticated
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
        if (token && isAuthenticated) {
            // Only redirect based on role
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 🚀 Login via api instance
            const response = await api.post(AUTH_URL, { email, password });
            const { token, user } = response.data || {};
            if (!token || !user) {
                throw new Error("Invalid login response from server");
            }
            // ✅ Save session
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("isAuthenticated", "true");
            toast.success(`Welcome back, ${user.name || "User"}!`);
            // ✅ Redirect based on role
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
                    navigate("/dashboard"); // Only admin can access /dashboard
                    break;
                default:
                    // Block non-admin from dashboard
                    toast.error("You are not authorized to access the admin dashboard.");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("isAuthenticated");
                    navigate("/"); // Redirect to home/login
            }
        }
        catch (error) {
            console.error("Login error:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("user");
            toast.error(error.response?.data?.message || "Login failed. Check your credentials.");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error("Please enter your email.");
            return;
        }
        try {
            await api.post(FORGOT_URL, { email: forgotEmail });
            toast.success("Password reset link sent to your email.");
            setIsForgotOpen(false);
        }
        catch (error) {
            toast.error(error.response?.data?.message || "Failed to send reset link.");
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsxs(CardHeader, { className: "space-y-1", children: [_jsx(CardTitle, { className: "text-2xl font-bold text-center", children: "\uD83C\uDF93 SchoolTrack Transport" }), _jsx(CardDescription, { className: "text-center", children: "Enter your credentials to access the system" })] }), _jsxs(CardContent, { children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "email", className: "text-sm font-medium", children: "Email" }), _jsx(Input, { id: "email", type: "email", placeholder: "your@email.com", value: email, onChange: (e) => setEmail(e.target.value), required: true, disabled: isLoading })] }), _jsxs("div", { className: "space-y-2 relative", children: [_jsx("label", { htmlFor: "password", className: "text-sm font-medium", children: "Password" }), _jsx(Input, { id: "password", type: showPassword ? "text" : "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: (e) => setPassword(e.target.value), required: true, disabled: isLoading }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-8 text-gray-500", children: showPassword ? _jsx(EyeOff, { size: 18 }) : _jsx(Eye, { size: 18 }) })] }), _jsx("div", { className: "text-right", children: _jsx("button", { type: "button", className: "text-sm text-blue-600 hover:underline", onClick: () => setIsForgotOpen(true), children: "Forgot Password?" }) }), _jsx(Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? "Signing in..." : "Sign In" })] }), isForgotOpen && (_jsx("div", { className: "fixed inset-0 bg-black/40 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl p-6 shadow-lg w-[90%] max-w-sm", children: [_jsx("h2", { className: "text-lg font-semibold mb-2 text-center", children: "Reset Password" }), _jsx("p", { className: "text-sm text-gray-500 mb-4 text-center", children: "Enter your email to receive a password reset link." }), _jsxs("form", { onSubmit: handleForgotPassword, className: "space-y-3", children: [_jsx(Input, { type: "email", placeholder: "Enter your email", value: forgotEmail, onChange: (e) => setForgotEmail(e.target.value), required: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "submit", className: "w-full", children: "Send Link" }), _jsx(Button, { type: "button", variant: "outline", className: "w-full", onClick: () => setIsForgotOpen(false), children: "Cancel" })] })] })] }) }))] })] }) }));
}

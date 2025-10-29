import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Buses from "./pages/Buses";
import Tracking from "./pages/Tracking";
import Manifests from "./pages/Manifests";
import Assistants from "./pages/Assistants";
import Drivers from "./pages/Drivers";
import Parents from "./pages/Parents";
import ParentPortal from "./pages/ParentPortal";
import DriverPortal from "./pages/DriverPortal";
import AssistantPortal from "./pages/AssistantPortal"; // ✅ use portal now
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/parent-portal" element={<ParentPortal />} />
            <Route path="/driver-portal" element={<DriverPortal />} />
            <Route path="/assistant-portal" element={<AssistantPortal />} /> {/* ✅ replaced */}

            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/buses" element={<Buses />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/manifests" element={<Manifests />} />
              <Route path="/assistants" element={<Assistants />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/parents" element={<Parents />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

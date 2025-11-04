import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
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
import AssistantPortal from "./pages/AssistantPortal";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AddBusPage from "./pages/AddBusForm"; // ✅ Import new Add Bus page

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
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Role-Based Portals */}
            <Route path="/parent-portal" element={<ParentPortal />} />
            <Route path="/driver-portal" element={<DriverPortal />} />
            <Route path="/assistant-portal" element={<AssistantPortal />} />

            {/* Admin Dashboard Layout */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />

              {/* Bus Management */}
              <Route path="/buses" element={<Buses />} />
              <Route path="/buses/add" element={<AddBusPage />} /> {/* ✅ Add Bus route */}

              <Route path="/tracking" element={<Tracking />} />
              <Route path="/manifests" element={<Manifests />} />
              <Route path="/assistants" element={<Assistants />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/parents" element={<Parents />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

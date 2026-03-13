// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "./pages/Login";
import Resolve from "./pages/Resolve";

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
import AddBusPage from "./pages/AddBusForm";

import AssetDashboard from "./pages/asset/AssetDashboard";
import Assets from "./pages/asset/Assets";
import AssetTracking from "./pages/asset/AssetTracking";
import AssetSettings from "./pages/asset/AssetSettings";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/DashboardLayout";
import { AssetLayout } from "./components/AssetLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 0, refetchOnWindowFocus: false, staleTime: 1000 * 30 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            {/* Portals (no sidebar layout) */}
            <Route path="parent-portal" element={<ParentPortal />} />
            <Route path="driver-portal" element={<DriverPortal />} />
            <Route path="assistant-portal" element={<AssistantPortal />} />

            {/* Styled Admin Shell (ALWAYS sidebar/nav) */}
            <Route element={<DashboardLayout />}>
              {/* Resolve inside styled shell */}
              <Route path="resolve" element={<Resolve />} />

              {/* Merchant uses same styled dashboard */}
              <Route path="merchant-dashboard" element={<Navigate to="/dashboard" replace />} />

              {/* Admin pages */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="buses" element={<Buses />} />
              <Route path="buses/add" element={<AddBusPage />} />
              <Route path="tracking" element={<Tracking />} />
              <Route path="manifests" element={<Manifests />} />
              <Route path="assistants" element={<Assistants />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="parents" element={<Parents />} />
              <Route path="settings" element={<Settings />} />

              {/* Asset section can either be inside this shell OR its own shell.
                  Keeping it separate as you had it (below). */}
            </Route>

            {/* Asset Admin layout */}
            <Route path="asset" element={<AssetLayout />}>
              <Route path="dashboard" element={<AssetDashboard />} />
              <Route path="assets" element={<Assets />} />
              <Route path="tracking" element={<AssetTracking />} />
              <Route path="settings" element={<AssetSettings />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// src/components/AssetLayout.tsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export function AssetLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r p-4 space-y-2">
        <div className="font-bold text-lg mb-4">Asset Tracking</div>

        <nav className="flex flex-col gap-2 text-sm">
          <NavLink className="hover:underline" to="/asset/dashboard">
            Dashboard
          </NavLink>
          <NavLink className="hover:underline" to="/asset/assets">
            Assets
          </NavLink>
          <NavLink className="hover:underline" to="/asset/tracking">
            Tracking
          </NavLink>
          <NavLink className="hover:underline" to="/asset/settings">
            Settings
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
"use client";

import React, { useState } from "react";
import Sidebar from "../layout/Sidebar";
import UserMenu from "../layout/UserMenu";

type AppShellProps = {
  children: React.ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="flex min-h-screen bg-background font-sans"
      style={
        {
          "--sidebar-width": isCollapsed ? "72px" : "260px",
        } as React.CSSProperties
      }
    >
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <UserMenu name="Felix Vincent" email="splenddev22@gmail.com" />

        <div className="flex-1 px-4 pb-12 pt-20 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

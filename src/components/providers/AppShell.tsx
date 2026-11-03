"use client";

import React, { useState } from "react";
import UserMenu from "../layout/user-menu";
import Sidebar from "../layout/Sidebar";

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

        <div className="kui-page-x flex-1 pb-12 pt-20 has-[>[data-kui-full-bleed]]:px-0!">
          {children}
        </div>
      </main>
    </div>
  );
};

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

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header
          className="
          sticky top-0 z-30 flex h-16 shrink-0
          items-center justify-end
          border-b border-border/60
          bg-background/85 px-5
          backdrop-blur-xl
          sm:px-8
        "
        >
          <UserMenu name="Felix Vincent" email="splenddev22@gmail.com" />
        </header>

        <div
          className="
          kui-page-x relative flex-1
          pb-10 pt-6
          sm:pb-12 sm:pt-8
          has-[>[data-kui-full-bleed]]:px-0!
        "
        >
          {children}
        </div>
      </main>
    </div>
  );
};

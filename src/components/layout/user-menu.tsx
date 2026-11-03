"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Settings,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Switch, useTheme } from "@splenddev/kreativ-ui";

type UserMenuProps = {
  name?: string;
  email?: string;
  onOpenSettings?: () => void;
  onOpenPreferences?: () => void;
  onHelp?: () => void;
  onSignOut?: () => void;
};

export default function UserMenu({
  name = "Workspace user",
  email,
  onOpenSettings,
  onOpenPreferences,
  onHelp,
  onSignOut,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { mode, setMode } = useTheme();

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleAction = (callback?: () => void) => {
    setIsOpen(false);
    callback?.();
  };

  const isDark = mode === "dark";

  return (
    <div ref={menuRef} className="fixed right-4 top-4 z-60 sm:right-6 sm:top-5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex items-center gap-2 rounded-xl border border-border bg-surface p-1.5 pr-3 shadow-sm transition-colors hover:bg-surface-raised"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg">
          {name.charAt(0).toUpperCase()}
        </div>

        <span className="hidden max-w-32 truncate text-sm font-medium text-text sm:block">
          {name}
        </span>

        <ChevronDown
          size={15}
          className={`text-text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] w-70 overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/10 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-fg">
                {name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {name}
                </p>
                {email && (
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-border p-2">
            <div className="flex items-center justify-between rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon size={17} className="text-text-muted" />
                ) : (
                  <Sun size={17} className="text-text-muted" />
                )}

                <div>
                  <p className="text-sm font-medium text-text">Appearance</p>
                  <p className="text-xs text-text-muted">
                    {isDark ? "Dark mode" : "Light mode"}
                  </p>
                </div>
              </div>
              <Switch
                onCheckedChange={() => setMode(isDark ? "light" : "dark")}
                size="md"
                checked={isDark}
              />
            </div>
          </div>

          <div className="space-y-1 border-b border-border p-2">
            <MenuItem
              icon={SlidersHorizontal}
              label="Preferences"
              onClick={() => handleAction(onOpenPreferences)}
            />

            <MenuItem
              icon={Settings}
              label="Settings"
              onClick={() => handleAction(onOpenSettings)}
            />

            <MenuItem
              icon={HelpCircle}
              label="Help & Support"
              onClick={() => handleAction(onHelp)}
            />
          </div>

          <div className="p-2">
            <MenuItem
              icon={LogOut}
              label="Sign out"
              destructive
              onClick={() => handleAction(onSignOut)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-text-muted hover:bg-surface-raised hover:text-text"
      }`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

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
  Check,
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { mode, setMode } = useTheme();

  const isDark = mode === "dark";

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (callback?: () => void) => {
    setIsOpen(false);
    callback?.();
  };

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        className="
          group flex items-center gap-2.5
          rounded-xl border border-transparent
          p-1.5 pr-2.5
          transition-colors
          hover:border-border
          hover:bg-surface-raised
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-brand
        "
      >
        <div
          className="
          flex h-9 w-9 shrink-0 items-center justify-center
          rounded-xl bg-brand text-sm font-semibold
          text-brand-fg
        "
        >
          {initials || "U"}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-32 truncate text-sm font-medium text-text">
            {name}
          </p>
          <p className="text-xs text-text-muted">Personal workspace</p>
        </div>

        <ChevronDown
          size={15}
          className={`
            text-text-muted transition-transform duration-200
            ${isOpen ? "rotate-180" : ""}
          `}
        />
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 top-[calc(100%+10px)]
            w-[min(290px,calc(100vw-2rem))]
            overflow-hidden rounded-xl
            border border-border/70
            bg-surface
            shadow-xl shadow-black/10
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div
                className="
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-xl bg-brand text-base font-semibold
                text-brand-fg
              "
              >
                {initials || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {name}
                </p>

                {email && (
                  <p className="mt-0.5 truncate text-xs text-text-muted">
                    {email}
                  </p>
                )}

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-text-muted">
                    Personal workspace
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-border p-2">
            <div
              className="
              flex items-center justify-between
              rounded-lg px-3 py-2.5
              hover:bg-surface-raised
            "
            >
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
                checked={isDark}
                onCheckedChange={() => setMode(isDark ? "light" : "dark")}
                size="md"
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
      onClick={onClick}
      className={`
        flex w-full items-center gap-3
        rounded-lg px-3 py-2.5
        text-sm font-medium
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-brand
        ${
          destructive
            ? "text-red-600 hover:bg-red-500/10"
            : "text-text-muted hover:bg-surface-raised hover:text-text"
        }
      `}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

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

type Offset = { x: number; y: number };

const STORAGE_KEY = "kui:user-menu-offset";
const DRAG_THRESHOLD = 4; // px before a press counts as a drag
const EDGE_MARGIN = 8; // keep at least this much on-screen

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredOffset(): Offset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as Partial<Offset>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 };
}

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

  // ---- drag state ---------------------------------------------------------
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Restore saved position (client-only; safe with SSR).
  useEffect(() => {
    const stored = readStoredOffset();
    if (stored.x !== 0 || stored.y !== 0) setOffset(stored);
  }, []);

  // Re-clamp into the viewport on resize / orientation change.
  useEffect(() => {
    const reclamp = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxLeft = Math.max(
        EDGE_MARGIN,
        window.innerWidth - rect.width - EDGE_MARGIN,
      );
      const maxTop = Math.max(
        EDGE_MARGIN,
        window.innerHeight - rect.height - EDGE_MARGIN,
      );
      const dx = clamp(rect.left, EDGE_MARGIN, maxLeft) - rect.left;
      const dy = clamp(rect.top, EDGE_MARGIN, maxTop) - rect.top;
      if (dx !== 0 || dy !== 0) {
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    };
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
    };
  }, []);

  // ---- close on outside click / Escape -----------------------------------
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

  // ---- drag handlers ------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return; // left-click only
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const totalDx = e.clientX - drag.startX;
    const totalDy = e.clientY - drag.startY;

    if (!drag.moved && Math.hypot(totalDx, totalDy) > DRAG_THRESHOLD) {
      drag.moved = true;
      if (isOpen) setIsOpen(false);
    }
    if (!drag.moved) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const maxLeft = Math.max(
      EDGE_MARGIN,
      window.innerWidth - rect.width - EDGE_MARGIN,
    );
    const maxTop = Math.max(
      EDGE_MARGIN,
      window.innerHeight - rect.height - EDGE_MARGIN,
    );
    const nextLeft = clamp(rect.left + dx, EDGE_MARGIN, maxLeft);
    const nextTop = clamp(rect.top + dy, EDGE_MARGIN, maxTop);

    setOffset((prev) => ({
      x: prev.x + (nextLeft - rect.left),
      y: prev.y + (nextTop - rect.top),
    }));
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (drag?.moved) {
      suppressClickRef.current = true;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(offsetRef.current));
      } catch {
        /* ignore */
      }
    }
  };

  const handleButtonClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={menuRef}
      className="fixed right-4 top-4 z-60 sm:right-6 sm:top-5"
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
    >
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleButtonClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex cursor-grab touch-none select-none items-center gap-2 rounded-xl border border-border bg-surface p-1.5 pr-3 shadow-sm transition-colors hover:bg-surface-raised active:cursor-grabbing"
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

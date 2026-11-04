"use client";

import React, {
  type AnchorHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link, { type LinkProps } from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, Moon, Settings, Sun } from "lucide-react";

import { Button, Switch, useTheme } from "@splenddev/kreativ-ui";
import { useSettings } from "@/features/settings/providers/settings-provider";

const WORKSPACE_LABEL = "Personal workspace";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { mode, setMode } = useTheme();
  const { settings, loading } = useSettings();

  const isDark = mode === "dark";
  const displayName = settings.profile.displayName?.trim() ?? "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  // Close on outside pointerdown
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Escape closes and restores focus to the trigger
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus first menu item on open (per ARIA menu button pattern)
  useEffect(() => {
    if (!isOpen) return;

    const id = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
        ?.focus();
    });

    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );

    if (items.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    const index = current ? items.indexOf(current) : -1;

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        items[index < 0 ? 0 : (index + 1) % items.length]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        items[index <= 0 ? items.length - 1 : index - 1]?.focus();
        break;
      }
      case "Home": {
        event.preventDefault();
        items[0]?.focus();
        break;
      }
      case "End": {
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
    }
  };

  const handleAction = (callback?: () => void) => {
    setIsOpen(false);
    callback?.();
  };

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(event) => {
          if (
            !isOpen &&
            (event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === " ")
          ) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="group flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 pr-2.5 transition-colors hover:border-border hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-fg">
          {initials}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          {loading ? (
            <>
              <div className="h-3.5 w-20 animate-pulse rounded bg-surface-raised" />
              <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-surface-raised" />
            </>
          ) : (
            <>
              <p className="max-w-32 truncate text-sm font-medium text-text">
                {displayName || "Account"}
              </p>
              <p className="text-xs text-text-muted">{WORKSPACE_LABEL}</p>
            </>
          )}
        </div>

        <ChevronDown
          size={15}
          aria-hidden
          className={`text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={listRef}
            role="menu"
            aria-label="Account menu"
            onKeyDown={handleMenuKeyDown}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] w-[min(290px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/70 bg-surface shadow-xl shadow-black/10"
          >
            {/* Profile header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-base font-semibold text-brand-fg">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  {loading ? (
                    <>
                      <div className="h-3.5 w-28 animate-pulse rounded bg-surface-raised" />
                      <div className="mt-2 h-3 w-36 animate-pulse rounded bg-surface-raised" />
                      <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-surface-raised" />
                    </>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold text-text">
                        {displayName || "Account"}
                      </p>

                      {settings.profile.email && (
                        <p className="mt-0.5 truncate text-xs text-text-muted">
                          {settings.profile.email}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-success"
                        />
                        <span className="text-[11px] text-text-muted">
                          {WORKSPACE_LABEL}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="border-b border-border p-2">
              <div className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-raised">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon size={17} className="text-text-muted" aria-hidden />
                  ) : (
                    <Sun size={17} className="text-text-muted" aria-hidden />
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

            {/* Navigation */}
            <div className="space-y-1 p-2">
              <MenuItem
                icon={Settings}
                label="Settings"
                href="/dashboard?tab=settings"
                onClick={() => handleAction()}
              />

              <MenuItem
                icon={HelpCircle}
                label="Help & Support"
                href="/help"
                onClick={() => handleAction()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type AnchorPropsForLink = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps<any>
>;

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  href,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}) {
  const content = (
    <>
      <Icon size={17} aria-hidden />
      <span>{label}</span>
    </>
  );

  return (
    <Button
      type="button"
      role={href ? undefined : "menuitem"}
      render={
        href
          ? (buttonProps) => {
              const {
                children: _children,
                onClick: _onClick,
                ...rest
              } = buttonProps as unknown as AnchorPropsForLink & {
                children?: ReactNode;
                onClick?: () => void;
              };

              return (
                <Link href={href} {...rest} role="menuitem" onClick={onClick}>
                  {content}
                </Link>
              );
            }
          : undefined
      }
      fullWidth
      variant="ghost"
      color={destructive ? "destructive" : "neutral"}
      onClick={href ? undefined : onClick}
      className="justify-start"
    >
      {href ? null : content}
    </Button>
  );
}

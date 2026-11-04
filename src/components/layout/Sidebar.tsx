"use client";

import React, { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  FileText,
  Clock,
  UploadCloud,
  LayoutTemplate,
  PenTool,
  FileSignature,
  Settings,
  HelpCircle,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderClosed,
} from "lucide-react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const navItems = [
  { id: "recent", label: "Recent Documents", icon: Clock, href: "/dashboard" },
  {
    id: "uploaded",
    label: "Uploaded",
    icon: UploadCloud,
    href: "/dashboard/uploaded",
  },
  {
    id: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    href: "/dashboard/templates",
  },
  {
    id: "signatures",
    label: "Signatures",
    icon: PenTool,
    href: "/dashboard/signatures",
  },
  {
    id: "handwriting",
    label: "Handwriting Assets",
    icon: FileSignature,
    href: "/dashboard/handwriting",
  },
];

const collections = [
  {
    id: "contracts",
    label: "Client Contracts",
    href: "/dashboard/collections/contracts",
  },
  {
    id: "tax",
    label: "Tax Forms Q2",
    href: "/dashboard/collections/tax",
  },
];

const footerItems = [
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
  {
    label: "Help & Support",
    icon: HelpCircle,
    href: "/dashboard/help",
  },
];

const AnimatedLabel = ({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.span
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: "auto" }}
        exit={{ opacity: 0, width: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden whitespace-nowrap"
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

type SidebarContentProps = {
  compact?: boolean;
  mobile?: boolean;
  pathname: string;
  isCollectionsOpen: boolean;
  setIsCollectionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCollapse?: () => void;
  onExpand?: () => void;
  onClose?: () => void;
};

const SidebarContent = ({
  compact = false,
  mobile = false,
  pathname,
  isCollectionsOpen,
  setIsCollectionsOpen,
  onCollapse,
  onExpand,
  onClose,
}: SidebarContentProps) => {
  const isActive = (href: string) => {
    if (pathname === href) return true;

    // The dashboard root should not remain active on every dashboard page.
    if (href === "/dashboard") return false;

    return pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div
        className={cn(
          "flex h-18 shrink-0 items-center",
          compact ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        <Link
          href="/dashboard"
          onClick={mobile ? onClose : undefined}
          className="flex min-w-0 items-center gap-3"
          aria-label="Kreativ Forms dashboard"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-fg shadow-sm">
            <FileText size={18} strokeWidth={2.5} />
          </div>

          <AnimatedLabel show={!compact}>
            <span className="text-lg font-semibold tracking-tight text-text">
              Kreativ Forms
            </span>
          </AnimatedLabel>
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={18} />
          </button>
        ) : (
          !compact && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:flex"
            >
              <ChevronLeft size={17} />
            </button>
          )
        )}
      </div>

      {compact && !mobile && (
        <div className="hidden px-3 pb-3 md:block">
          <button
            type="button"
            onClick={onExpand}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="flex h-9 w-full items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div
        className={cn(
          "shrink-0 pb-5",
          compact && !mobile ? "px-3 md:px-4" : "px-4",
        )}
      >
        <Link
          href="/dashboard/new"
          onClick={mobile ? onClose : undefined}
          title={compact && !mobile ? "New Document" : undefined}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-brand-fg shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            compact && !mobile ? "md:px-0" : "",
          )}
        >
          <Plus size={17} className="shrink-0" />
          <AnimatedLabel show={!compact}>New Document</AnimatedLabel>
        </Link>
      </div>

      <div className="custom-scrollbar kui-scrollbar flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-2">
        <div>
          <AnimatePresence initial={false}>
            {!compact && (
              <motion.h2
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden px-3 text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                Workspace
              </motion.h2>
            )}
          </AnimatePresence>

          <nav aria-label="Workspace">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={mobile ? onClose : undefined}
                      title={compact && !mobile ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                        active
                          ? "bg-brand/10 font-medium text-brand"
                          : "text-text-muted hover:bg-surface-raised hover:text-text",
                        compact && !mobile ? "md:justify-center md:px-0" : "",
                      )}
                    >
                      <item.icon size={18} className="shrink-0" />

                      <AnimatedLabel show={!compact}>
                        {item.label}
                      </AnimatedLabel>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div>
          <div
            className={cn(
              "mb-2 flex items-center",
              compact && !mobile ? "md:hidden" : "justify-between px-3",
            )}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Collections
            </h2>

            <button
              type="button"
              onClick={() => setIsCollectionsOpen((open) => !open)}
              aria-label={
                isCollectionsOpen
                  ? "Collapse collections"
                  : "Expand collections"
              }
              aria-expanded={isCollectionsOpen}
              className="flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <motion.div
                animate={{ rotate: isCollectionsOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
          </div>

          {compact && !mobile && (
            <div className="flex justify-center pb-2">
              <Link
                href="/dashboard/collections"
                title="Collections"
                aria-label="Collections"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
              >
                <FolderClosed size={18} />
              </Link>
            </div>
          )}

          <AnimatePresence initial={false}>
            {isCollectionsOpen && !compact && (
              <motion.ul
                key="collections-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-1 overflow-hidden"
              >
                {collections.map((collection) => {
                  const active = isActive(collection.href);

                  return (
                    <li key={collection.id}>
                      <Link
                        href={collection.href}
                        onClick={mobile ? onClose : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          active
                            ? "bg-surface-raised font-medium text-text"
                            : "text-text-muted hover:bg-surface-raised hover:text-text",
                        )}
                      >
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-sunken">
                          <div className="h-1.5 w-1.5 rounded-sm bg-text-muted opacity-50" />
                        </div>

                        <span className="whitespace-nowrap">
                          {collection.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        {footerItems.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);

          return (
            <Link
              key={label}
              href={href}
              onClick={mobile ? onClose : undefined}
              title={compact && !mobile ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "bg-surface-raised font-medium text-text"
                  : "text-text-muted hover:bg-surface-raised hover:text-text",
                compact && !mobile ? "md:justify-center md:px-0" : "",
              )}
            >
              <Icon size={18} className="shrink-0" />
              <AnimatedLabel show={!compact}>{label}</AnimatedLabel>
            </Link>
          );
        })}
      </div>
    </>
  );
};

type SidebarProps = {
  isCollapsed?: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

const Sidebar = ({ isCollapsed = false, setIsCollapsed }: SidebarProps) => {
  const pathname = usePathname();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(true);

  const mobileSidebarRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  const closeMobileSidebar = (restoreFocus = false) => {
    setIsMobileOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => {
        mobileTriggerRef.current?.focus();
      });
    }
  };

  // Handle mobile drawer focus, keyboard navigation and body scrolling.
  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const sidebar = mobileSidebarRef.current;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const getFocusableElements = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));

    const focusableElements = getFocusableElements();

    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSidebar(true);
        return;
      }

      if (event.key !== "Tab") return;

      const elements = getFocusableElements();

      if (!elements.length) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  // Close the drawer after route navigation.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const contentProps = {
    pathname,
    isCollectionsOpen,
    setIsCollectionsOpen,
  };

  return (
    <>
      <button
        ref={mobileTriggerRef}
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open sidebar"
        aria-expanded={isMobileOpen}
        aria-controls="mobile-sidebar"
        className="fixed left-4 top-3 z-60 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text shadow-sm transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
      >
        <Menu size={20} />
      </button>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        onClick={() => closeMobileSidebar()}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden",
          isMobileOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={mobileSidebarRef}
        id="mobile-sidebar"
        aria-label="Mobile navigation"
        aria-hidden={!isMobileOpen}
        inert={!isMobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-65 flex h-screen w-[min(280px,85vw)] shrink-0 flex-col border-r border-border/70 bg-surface font-sans transition-transform duration-300 ease-in-out md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          {...contentProps}
          compact={false}
          mobile
          onClose={() => closeMobileSidebar()}
        />
      </aside>

      <aside
        aria-label="Desktop navigation"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-surface font-sans transition-[width] duration-300 ease-in-out md:flex",
          isCollapsed ? "w-18" : "w-65",
        )}
      >
        <SidebarContent
          {...contentProps}
          compact={isCollapsed}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
        />
      </aside>
    </>
  );
};

export default Sidebar;

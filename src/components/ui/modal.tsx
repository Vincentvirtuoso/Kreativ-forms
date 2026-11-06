"use client";

import { cn } from "@/lib/cn";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Prevent closing via backdrop / Escape while true */
  busy?: boolean;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  /** Optional footer (typically action buttons) */
  footer?: ReactNode;
  /** Panel width */
  size?: ModalSize;
  /** Extra classes on the panel */
  className?: string;
  /** role defaults to "dialog". Use "alertdialog" for confirms */
  role?: "dialog" | "alertdialog";
}

export function Modal({
  open,
  onClose,
  busy = false,
  title,
  description,
  children,
  footer,
  size = "md",
  className = "",
  role = "dialog",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Resolve themed portal root from an in-place sentinel
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const sentinelRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node) {
      setPortalRoot(null);
      return;
    }
    setPortalRoot(
      node.closest<HTMLElement>("[data-kreativ-theme]") ?? document.body,
    );
  }, []);

  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  // Focus restore
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
    } else {
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;

    const { body, documentElement } = document;
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  // Escape + simple focus trap
  useEffect(() => {
    if (!open || !portalRoot) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, portalRoot]);

  return (
    <>
      <span ref={sentinelRef} hidden aria-hidden="true" />

      {open &&
        portalRoot &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget && !busy) {
                onClose();
              }
            }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
              aria-hidden="true"
            />

            {/* Panel */}
            <div
              ref={panelRef}
              role={role}
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
              className={cn(
                "relative z-10 flex w-full flex-col overflow-hidden",
                "max-h-[85dvh]",
                SIZE_CLASSES[size],
                "rounded-t-2xl border border-border bg-background shadow-xl",
                "p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
                "animate-in fade-in slide-in-from-bottom-4 duration-200",
                "sm:rounded-xl sm:slide-in-from-bottom-0 sm:zoom-in-95",
                className,
              )}
            >
              {(title || description) && (
                <div className="mb-5 shrink-0">
                  {title && (
                    <h2
                      id={titleId}
                      className="text-base font-semibold tracking-tight text-foreground"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <div
                      id={descriptionId}
                      className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
                    >
                      {description}
                    </div>
                  )}
                </div>
              )}

              {/* Body — scrolls when content is tall */}
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

              {footer && (
                <footer className="mt-4 shrink-0 border-t border-border pt-4">
                  {footer}
                </footer>
              )}
            </div>
          </div>,
          portalRoot,
        )}
    </>
  );
}

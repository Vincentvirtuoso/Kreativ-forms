"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Show / hide the native dialog in sync with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Bridge the native `close` event (Esc, backdrop, form methods) back to React.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-screen w-screen max-w-none max-h-none border-0 bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {/* Full-bleed flex wrapper – clicking the empty area closes the modal. */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
      >
        <div
          role="document"
          className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)]`}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="min-w-0">
                {title && (
                  <h2 className="text-sm font-semibold text-text">{title}</h2>
                )}
                {description && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-m-1 shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="px-5 py-4">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted/40 px-5 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

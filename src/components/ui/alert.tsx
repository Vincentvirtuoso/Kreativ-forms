import type { ComponentType, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";

type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  /** Optional buttons or links shown under the message, e.g. "Retry". */
  actions?: ReactNode;
  /** Replace the default icon, or pass `null` to hide it. */
  icon?: ComponentType<{ className?: string }> | null;
  onDismiss?: () => void;
  className?: string;
}

const ICONS: Record<AlertVariant, ComponentType<{ className?: string }>> = {
  error: XCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
};

// Full class strings, so Tailwind can see them. Only the border, tint and
// icon/title take the status color. Body text stays the normal text color,
// which keeps long messages readable instead of tinted.
const STYLES: Record<AlertVariant, { container: string; accent: string }> = {
  error: {
    container: "border-destructive/30 bg-destructive/5",
    accent: "text-destructive",
  },
  success: {
    container: "border-success/30 bg-success/5",
    accent: "text-success",
  },
  info: {
    container: "border-info/30 bg-info/5",
    accent: "text-info",
  },
  warning: {
    container: "border-warning/30 bg-warning/5",
    accent: "text-warning",
  },
};

export function Alert({
  variant = "error",
  title,
  children,
  actions,
  icon,
  onDismiss,
  className,
}: AlertProps) {
  const Icon = icon === undefined ? ICONS[variant] : icon;
  const styles = STYLES[variant];

  // Errors and warnings interrupt screen readers. Success and info wait their
  // turn, so a "Saved" message doesn't cut off whatever is being read.
  const urgent = variant === "error" || variant === "warning";

  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-sm text-text",
        styles.container,
        className ?? "",
      )}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 h-4 w-4 shrink-0", styles.accent)}
        />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className={cn("font-medium", styles.accent)}>{title}</p>}

        {children && (
          <div className="wrap-break-word leading-5 [&_a]:underline">
            {children}
          </div>
        )}

        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            // Padding grows the tap target without moving the icon much.
            "-m-1 shrink-0 rounded-md p-1 pointer-coarse:p-2",
            "text-text-muted transition-colors hover:text-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
}

const ICONS: Record<AlertVariant, typeof AlertCircle> = {
  error: XCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
};

const STYLES: Record<AlertVariant, string> = {
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  success: "border-success/30 bg-success/5 text-success",
  info: "border-info/30 bg-info/5 text-info",
  warning: "border-warning/30 bg-warning/5 text-warning",
};

export function Alert({
  variant = "error",
  title,
  children,
  onDismiss,
}: AlertProps) {
  const Icon = ICONS[variant];

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-lg border p-3 text-sm ${STYLES[variant]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog, type ConfirmAction } from "../ui/confirm-dialog";

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: ConfirmAction["color"];
  confirmVariant?: ConfirmAction["variant"];
  cancelVariant?: ConfirmAction["variant"];
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable ref so the returned confirm() identity doesn't thrash
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setBusy(false);
      setPending({ ...options, resolve });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (busy) return;
    pendingRef.current?.resolve(false);
    setPending(null);
  }, [busy]);

  const handleConfirm = useCallback(() => {
    pendingRef.current?.resolve(true);
    setPending(null);
  }, []);

  const actions = useMemo<ConfirmAction[]>(() => {
    if (!pending) return [];

    return [
      {
        label: pending.cancelLabel ?? "Cancel",
        variant: pending.cancelVariant ?? "outline",
        color: "neutral",
        onClick: handleCancel,
      },
      {
        label: pending.confirmLabel ?? "Confirm",
        variant: pending.confirmVariant ?? "solid",
        color: pending.confirmColor ?? "destructive",
        autoFocus: true,
        onClick: handleConfirm,
      },
    ];
  }, [pending, handleCancel, handleConfirm]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        description={pending?.description ?? null}
        actions={actions}
        busy={busy}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return confirm;
}

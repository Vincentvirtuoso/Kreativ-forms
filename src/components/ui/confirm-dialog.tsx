"use client";

import type { ReactNode } from "react";
import { Button } from "@splenddev/kreativ-ui";
import { Modal } from "./modal";

export interface ConfirmAction {
  label: string;
  onClick: () => void;
  variant?: "solid" | "outline" | "ghost";
  color?: "brand" | "neutral" | "destructive";
  loading?: boolean;
  autoFocus?: boolean;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  actions: ConfirmAction[];
  busy?: boolean;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  actions,
  busy = false,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      title={title}
      description={description}
      role="alertdialog"
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant={action.variant ?? "outline"}
            color={action.color ?? "neutral"}
            autoFocus={action.autoFocus}
            isLoading={action.loading}
            disabled={busy && !action.loading}
            onClick={action.onClick}
            className="min-w-22"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
}

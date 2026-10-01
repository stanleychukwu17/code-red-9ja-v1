/**
 * @file Generic Action Confirmation Alert Dialog
 * @description Standard alert modal prompting confirmation prior to state-altering or destructive actions
 * (e.g. suspending or blocking users, revoking agent assignments, removing campaigns).
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

export type ConfirmAlertDialogProps = {
  open: boolean;
  onConfirm: () => void;
  title?: string;
  subtitle?: string;
  setOpen?: (v: boolean) => void;
  isPending?: boolean;
  headerTitle?: string;
  actionText?: string;
  actionVariant?: "red" | "primary" | "secondary" | "destructive" | "default";
  children?: React.ReactNode;
};

/**
 * ConfirmAlertDialog Component
 * Reusable modal displaying custom title, explanation subtitle, and confirmation action button.
 */
export const ConfirmAlertDialog = ({
  open,
  onConfirm,
  title,
  subtitle,
  setOpen,
  isPending = false,
  headerTitle = "Confirm Action",
  actionText = "Confirm",
  actionVariant = "red",
  children,
}: ConfirmAlertDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-105 p-0 rounded-2xl border border-border shadow-2xl bg-card text-card-foreground overflow-hidden">
        <DialogHeader title={headerTitle} />

        <DialogPadding className="space-y-3 pb-4">
          <h1 className="text-[18px] font-semibold text-c-80 leading-tight">
            {title ?? "Are you sure you want to proceed?"}
          </h1>
          {subtitle && <p className="text-sm text-c-60">{subtitle}</p>}
          {children}
        </DialogPadding>

        <DialogFooter className="flex justify-end gap-3 px-6 pb-6">
          <Button
            variant="ghost"
            onClick={() => setOpen?.(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={actionVariant as any}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

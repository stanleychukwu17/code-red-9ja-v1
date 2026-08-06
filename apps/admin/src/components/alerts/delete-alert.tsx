import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

type DeleteAlertDialogProps = {
  open: boolean;
  delete: () => void;
  title?: string;
  subtitle?: string;
  setOpen?: (v: boolean) => void;
  isPending?: boolean;
};

export const DeleteAlertDialog = ({
  open,
  delete: handleDelete,
  title,
  subtitle,
  setOpen,
  isPending = false,
}: DeleteAlertDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-105 p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Confirm Delete" />

        <DialogPadding className="space-y-3 pb-4">
          <h1 className="text-[18px] font-semibold text-c-80 leading-tight">
            {title ?? "Are you sure you want to delete this?"}
          </h1>
          {subtitle && <p className="text-sm text-c-60">{subtitle}</p>}
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
            variant="red"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

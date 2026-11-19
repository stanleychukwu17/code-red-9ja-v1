import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { AlertTriangle } from "lucide-react";

export type MissingLocationAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableLocation: () => void;
  onConfirmSubmit: () => void;
};

/**
 * Confirmation dialog alerting agents that submitting without verified GPS reduces their earnings.
 */
export function MissingLocationAlertDialog({
  open,
  onOpenChange,
  onEnableLocation,
  onConfirmSubmit,
}: MissingLocationAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <AlertTriangle className="size-5 text-amber-500 shrink-0" />
            Submit without GPS location?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-1 text-sm text-muted-foreground text-left">
            <p>
              Your update will still be submitted and recorded, but updates without verified polling unit GPS coordinates will cause a <strong className="text-foreground font-semibold">reduction in payment</strong>.
            </p>
            <p>
              To receive full compensation, turn on location in your phone settings and tap <strong>Turn on GPS</strong>.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={() => {
              onOpenChange(false);
              onEnableLocation();
            }}
            className="cursor-pointer font-semibold"
          >
            Turn on GPS
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              onConfirmSubmit();
            }}
            className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            Submit anyway (Reduced Pay)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

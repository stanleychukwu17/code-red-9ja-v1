import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { Package, X } from "lucide-react";

export function AccountDetailsDialog({
  open,
  setOpen,
  onClose,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white">
        <DialogHeader title="Account details" />

        <DialogPadding className="space-y-8 mb-5">
          <div className="flex items-start gap-3 rounded-xl bg-[#edf3ff] px-4 py-3">
            <Package className="size-5 shrink-0 text-[#3182ce] mt-0.5" />
            <p className="leading-6 text-sm font-medium text-[#2b6cb0]">
              Transfer money to the below account and it will be automatically
              added to the NDC Wallet.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[14px] text-c-50">Account Number</p>
            <div className="text-[40px] font-medium text-c-80 leading-none">
              6075512903
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-2">
            <div className="space-y-2">
              <p className="text-sm text-c-50">Bank</p>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-[#7a1b7a] flex items-center justify-center text-white text-[10px] font-extrabold tracking-tighter">
                  W
                </div>
                <span className="text-lg font-medium text-c-80">Wema Bank</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-c-50">Account Name</p>
              <div className="text-lg font-medium text-c-80 leading-snug">
                Nigeria Democratic Congress
              </div>
            </div>
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button variant="deepGrey" size="lg" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

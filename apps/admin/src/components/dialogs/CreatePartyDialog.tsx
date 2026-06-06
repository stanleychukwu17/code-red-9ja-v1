import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Plus, Umbrella } from "lucide-react";

export function CreatePartyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [acronym, setAcronym] = React.useState("");
  const [fullName, setFullName] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="Create Party" />

        <DialogPadding className="space-y-6 pb-6">
          {/* Party acronym input */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Party acronym"
              value={acronym}
              onChange={(e) => setAcronym(e.target.value)}
              className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
            />
          </div>

          {/* Party full name input */}
          <div>
            <label className="text-[14px] font-semibold text-c-50">Party full name</label>
            <input
              type="text"
              placeholder="Enter party full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex w-full h-12 rounded-[12px] bg-[#f2f2f2] px-4 text-[16px] text-c-80 placeholder:text-c-40 mt-1 outline-none"
            />
          </div>

          {/* Party Logo upload */}
          <div>
            <label className="text-[14px] font-semibold text-c-50">Party Logo</label>
            <div className="flex items-center gap-6 mt-2">
              <div className="size-28 rounded-full bg-[#e2e8f0] flex items-center justify-center text-c-40">
                <Umbrella className="size-12 shrink-0" />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-11 items-center gap-2 rounded-[12px] bg-[#1a1a1a] hover:bg-[#000] px-4 text-[15px] font-semibold text-white transition cursor-pointer">
                  <Plus className="size-5" />
                  <span>Upload image</span>
                </button>
                <button className="flex h-11 items-center rounded-[12px] border border-[#dfdfdf] px-4 text-[15px] font-semibold text-red-600 hover:bg-[#fafafa] transition cursor-pointer">
                  Remove image
                </button>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex items-center justify-end pt-4">
            <Button
              className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer"
              onClick={onClose}
            >
              Create
            </Button>
          </div>
        </DialogPadding>
      </DialogContent>
    </Dialog>
  );
}

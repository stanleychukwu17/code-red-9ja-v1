import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown, Folder, Calendar, Plus } from "lucide-react";

export function NewElectionInstanceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [electionName, setElectionName] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("Presidential");
  const [isTypeOpen, setIsTypeOpen] = React.useState(false);

  const types = ["Presidential", "Governorship", "Senatorial", "House of Representatives"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="New Election Instance" />

        <DialogPadding className="space-y-6 pb-6">
          {/* Election name input */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Election name"
              value={electionName}
              onChange={(e) => setElectionName(e.target.value)}
              className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
            />
          </div>

          {/* Type dropdown */}
          <div className="relative">
            <label className="text-[14px] font-semibold text-c-50">Type</label>
            <button
              onClick={() => setIsTypeOpen(!isTypeOpen)}
              className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
            >
              <span>{selectedType}</span>
              <ChevronDown className="size-5 text-c-40 shrink-0" />
            </button>

            {isTypeOpen && (
              <div className="absolute left-0 w-full mt-2 rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type);
                      setIsTypeOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Candidates Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-semibold text-c-70">Candidates</span>
              <div className="flex items-center gap-2">
                <button className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#1a1a1a] hover:bg-[#000] px-3.5 text-[14px] font-semibold text-white transition cursor-pointer">
                  <Plus className="size-4" />
                  <span>Existing</span>
                </button>
                <button className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#1a1a1a] hover:bg-[#000] px-3.5 text-[14px] font-semibold text-white transition cursor-pointer">
                  <Plus className="size-4" />
                  <span>New</span>
                </button>
              </div>
            </div>

            <div className="h-32 rounded-xl bg-[#f7f7f7] border border-dashed border-[#e2e8f0] flex items-center justify-center">
              <span className="text-[15px] text-c-40 font-semibold">0 candidates</span>
            </div>
          </div>

          {/* Bottom pills & Create Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <button className="flex h-10 items-center gap-2 rounded-[12px] border border-[#dfdfdf] px-4 bg-white text-[15px] font-semibold text-c-70 hover:bg-[#fafafa] cursor-pointer">
                <Folder className="size-4 text-[#ffbf2e] fill-[#ffbf2e]" />
                <span>Election Group</span>
              </button>
              <button className="flex h-10 items-center gap-2 rounded-[12px] border border-[#dfdfdf] px-4 bg-white text-[15px] font-semibold text-c-70 hover:bg-[#fafafa] cursor-pointer">
                <Calendar className="size-4 text-c-50" />
                <span>Election Date</span>
              </button>
            </div>

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

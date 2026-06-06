import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown } from "lucide-react";

export function CreateElectionTypeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [typeName, setTypeName] = React.useState("");
  const [selectedTarget, setSelectedTarget] = React.useState("Nationwide");
  const [isTargetOpen, setIsTargetOpen] = React.useState(false);

  const [selectedRank, setSelectedRank] = React.useState("Rank 1");
  const [isRankOpen, setIsRankOpen] = React.useState(false);

  const [officeTitle, setOfficeTitle] = React.useState("");

  const targets = ["Nationwide", "State", "District", "Constituency"];
  const ranks = ["Rank 1", "Rank 2", "Rank 3", "Rank 4"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="Create Election Type" />

        <DialogPadding className="space-y-6 pb-6">
          {/* Election type input */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Election type"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
            />
          </div>

          {/* Target and Rank layout grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Target select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">Target</label>
              <button
                onClick={() => setIsTargetOpen(!isTargetOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span>{selectedTarget}</span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isTargetOpen && (
                <div className="absolute left-0 w-full mt-2 rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {targets.map((target) => (
                    <button
                      key={target}
                      onClick={() => {
                        setSelectedTarget(target);
                        setIsTargetOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {target}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rank select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">Rank</label>
              <button
                onClick={() => setIsRankOpen(!isRankOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span>{selectedRank}</span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isRankOpen && (
                <div className="absolute left-0 w-full mt-2 rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {ranks.map((rank) => (
                    <button
                      key={rank}
                      onClick={() => {
                        setSelectedRank(rank);
                        setIsRankOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {rank}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Office Title */}
          <div>
            <label className="text-[14px] font-semibold text-c-50">Office title</label>
            <input
              type="text"
              placeholder="E.g., President"
              value={officeTitle}
              onChange={(e) => setOfficeTitle(e.target.value)}
              className="flex w-full h-12 rounded-[12px] bg-[#f2f2f2] px-4 text-[16px] text-c-80 placeholder:text-c-40 mt-1 outline-none"
            />
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

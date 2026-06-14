import ExportIcon from "@repo/ui/icons/export-icon";
import { ChevronDown, Share2, Upload } from "lucide-react";

export function PartyMembersActions({
  showElectionFilter = false,
}: {
  showElectionFilter?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button className="flex h-11 items-center gap-4 rounded-[12px] border border-[#dfdfdf] bg-white px-4 text-[16px] text-[#3b3b3b] transition hover:bg-[#fafafa]">
        Export
        <ExportIcon />
      </button>

      {showElectionFilter ? (
        <button className="flex h-11 items-center gap-3 rounded-[12px] border border-[#dfdfdf] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
          <span>Presidential</span>
          <span className="text-[#8d9690]">2027</span>
          <ChevronDown className="size-4 text-[#8d9690]" />
        </button>
      ) : null}
    </div>
  );
}

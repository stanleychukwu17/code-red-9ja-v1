import { ChevronDown } from "lucide-react";
import ExportIcon from "@repo/ui/icons/export-icon";

export function ApplicationsActions() {
  return (
    <div className="flex items-center gap-3">
      <button className="flex h-11 items-center gap-2 rounded-[12px] bg-[#262626] px-5 text-[16px] font-medium text-white transition hover:bg-[#111]">
        Accept all
      </button>
      <button className="flex h-11 items-center gap-4 rounded-[12px] border border-[#dddddd] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
        Export
        <ExportIcon />
      </button>
      <button className="flex h-11 items-center gap-3 rounded-[12px] border border-[#dddddd] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
        <span>Presidential</span>
        <span className="text-[#8d9690]">2027</span>
        <ChevronDown className="size-4 text-[#8d9690]" />
      </button>
    </div>
  );
}

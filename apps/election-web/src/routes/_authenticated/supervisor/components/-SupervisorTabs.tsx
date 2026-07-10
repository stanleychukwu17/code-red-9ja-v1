import { cn } from "@repo/ui/lib/utils";

interface SupervisorTabsProps {
  activeTab: "Earnings" | "Objectives";
  onTabChange: (tab: "Earnings" | "Objectives") => void;
}

export function SupervisorTabs({ activeTab, onTabChange }: SupervisorTabsProps) {
  return (
    <div className="w-full bg-[#F5F5F5] p-1.5 rounded-2xl flex items-center justify-between mt-2">
      <button
        onClick={() => onTabChange("Earnings")}
        className={cn(
          "flex-1 h-12 rounded-xl text-[16px] font-semibold transition-all duration-300",
          activeTab === "Earnings"
            ? "bg-[#0B4A2D] text-white shadow-md"
            : "text-[#111111] bg-transparent hover:bg-gray-200"
        )}
      >
        Earnings
      </button>
      <button
        onClick={() => onTabChange("Objectives")}
        className={cn(
          "flex-1 h-12 rounded-xl text-[16px] font-semibold transition-all duration-300",
          activeTab === "Objectives"
            ? "bg-[#0B4A2D] text-white shadow-md"
            : "text-[#111111] bg-transparent hover:bg-gray-200"
        )}
      >
        Objectives
      </button>
    </div>
  );
}

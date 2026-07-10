import { AlertTriangle, ChevronRight } from "lucide-react";

export function ObjectivesTab() {
  const objectives = [
    { label: "Agents not at their polling unit", count: "3,853" },
    { label: "Agents who have given no update in 1 hour +", count: "521" },
    { label: "Agents who are yet to upload their polling unit result", count: "521" },
  ];

  return (
    <div className="w-full flex flex-col gap-6 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Warning Banner */}
      <div className="w-full bg-[#FFF3D6] rounded-2xl p-5 flex items-start gap-4 shadow-sm border border-yellow-100">
        <AlertTriangle className="w-6 h-6 text-[#B4841F] shrink-0 mt-0.5" />
        <p className="text-[16px] font-bold text-[#1F3D30] leading-snug">
          Call every single one of them till they do their duty and watch your earnings go up.
        </p>
      </div>

      {/* Objectives List */}
      <div className="w-full flex flex-col px-1 gap-6">
        {objectives.map((obj, index) => (
          <div key={index} className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full bg-[#D1D5DB] shrink-0" />
              <span className="text-[16px] text-gray-700 max-w-[220px] leading-snug">
                {obj.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold text-[#111111]">
                {obj.count}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

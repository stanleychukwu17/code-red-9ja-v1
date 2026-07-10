import { ArrowDownIcon } from "lucide-react";

export function EarningsTab() {
  const earnings = [
    { title: "Objectives 1% topup", time: "2:09 PM", amount: "₦500" },
    { title: "Objectives 1% topup", time: "12:09 PM", amount: "₦500" },
    { title: "Objectives 1% topup", time: "12:09 PM", amount: "₦500" },
  ];

  return (
    <div className="w-full flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Earnings Summary Card */}
      <div className="w-full bg-[#FFF5E6] rounded-2xl p-5 flex flex-col shadow-sm border border-orange-100">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div className="flex flex-col">
              <span className="text-[18px] font-medium text-[#111111]">
                Earnings so far
              </span>
              <span className="text-[14px] text-gray-500">
                Objectives completion
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[22px] font-bold text-[#111111]">
              ₦11,000.00
            </span>
            <span className="text-[14px] text-gray-500">22%</span>
          </div>
        </div>
      </div>

      {/* Earnings List */}
      <div className="w-full flex flex-col px-2 mt-2">
        {earnings.map((earning, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E5F7ED] flex items-center justify-center shrink-0">
                <ArrowDownIcon className="w-5 h-5 text-[#00C271]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium text-[#111111]">
                  {earning.title}
                </span>
                <span className="text-[13px] text-gray-400">
                  {earning.time}
                </span>
              </div>
            </div>
            <span className="text-[16px] font-bold text-[#111111]">
              {earning.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

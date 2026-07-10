import { Button } from "@repo/ui/components/button";

interface SupervisorActionCardProps {
  isReadyToStart: boolean;
  onArrive: () => void;
  onCallAgents: () => void;
}

export function SupervisorActionCard({ isReadyToStart, onArrive, onCallAgents }: SupervisorActionCardProps) {
  if (isReadyToStart) {
    return (
      <div className="w-full bg-[#F5F5F5] rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Tent" className="w-4 h-4 object-contain" />
            <span className="text-[13px] font-semibold text-gray-500">Zauda Polling Unit</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-500">Abia</span>
        </div>
        
        <h2 className="text-[24px] font-bold text-[#1F3D30] leading-tight mt-1">
          Are you ready to start
        </h2>

        <Button 
          onClick={onArrive}
          className="w-full bg-[#7354F4] hover:bg-[#5E41D9] text-white rounded-2xl py-4 h-auto text-lg font-bold mt-2 shadow-sm transition-transform active:scale-95"
        >
          Yes, I've arrived
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F5F5F5] rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Tent" className="w-4 h-4 object-contain" />
          <span className="text-[13px] font-semibold text-gray-500">Bwari</span>
        </div>
        <span className="text-[13px] font-semibold text-gray-500">FCT</span>
      </div>
      
      <h2 className="text-[22px] font-bold text-[#1F3D30] leading-[1.3] mt-1 pr-4">
        Your Payment is tied to your agents doing their duties. Call them and ensure they do all of them.
      </h2>

      <Button 
        onClick={onCallAgents}
        className="w-full bg-[#00E58B] hover:bg-[#00CC7C] text-[#0A2619] rounded-2xl py-4 h-auto text-[17px] font-bold mt-2 shadow-sm transition-transform active:scale-95"
      >
        Call polling unit (PU) agents
      </Button>
    </div>
  );
}

import { Button } from "@repo/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export function GiveUpdateFloatingButton({ onClick }: { onClick: () => void }) {
  const navigate = useNavigate();

  return (
    <>
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
      <div className="fixed bottom-8 right-6 md:absolute flex flex-col items-center gap-1 z-50">
        <span
          className="font-black text-white text-sm tracking-wider"
          style={{
            animation: "float 2.5s ease-in-out infinite",
            textShadow: "0 0px 6px rgba(0,0,0,0.95)",
          }}
        >
          Give Update
        </span>
        <Button
          onClick={onClick}
          variant="secondary"
          className="size-14 rounded-full flex items-center justify-center shadow-[0_2px_20px_rgba(0,0,0,0.30)] hover:bg-[#00C271] hover:scale-105 active:scale-95 transition-all"
        >
          <PlusIcon className="size-7 text-black/50" />
        </Button>
      </div>
    </>
  );
}

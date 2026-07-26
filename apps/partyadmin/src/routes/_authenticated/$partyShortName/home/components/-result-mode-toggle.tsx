import { cn } from "@repo/ui/lib/utils";

interface ResultModeToggleProps {
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
  className?: string;
}

export function ResultModeToggle({
  isLive,
  setIsLive,
  className,
}: ResultModeToggleProps) {
  return (
    <button
      onClick={() => setIsLive(!isLive)}
      className={cn(
        "shrink-0 relative flex items-center h-11 px-3 pr-4 gap-2.5 rounded-full transition-colors focus:outline-none select-none cursor-pointer",
        isLive ? "bg-emerald-100/80" : "hover:bg-neutral-100",
        className,
      )}
    >
      <div
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          isLive ? "bg-emerald-500" : "bg-[#b1b4b9]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            isLive ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight",
          isLive ? "text-emerald-500" : "text-[#2a2a2a]",
        )}
      >
        {isLive ? "Live Result" : "Final Result"}
      </span>
    </button>
  );
}

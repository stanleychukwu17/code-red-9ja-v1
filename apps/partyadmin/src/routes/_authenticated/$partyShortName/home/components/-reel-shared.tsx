import { AppAvatar } from "@repo/ui/components/avatar";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";
import { useEffect } from "react";
import { X } from "lucide-react";

/** Simple icon + label button used throughout the reels UI */
export function PostActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer text-white/50 hover:text-white/90 transition duration-200"
    >
      {icon}
      <span className="text-xs font-medium text-white/50">{label}</span>
    </button>
  );
}

/** Keyboard + Escape listener for reel navigation */
export function useReelKeyboard({
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  onClose,
}: {
  hasNext?: boolean;
  hasPrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (hasNext) onNext?.();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (hasPrev) onPrev?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, hasPrev, onNext, onPrev, onClose]);
}

/** Up / Down navigation arrow buttons pinned to the right side of the reel */
export function ReelNavButtons({
  hasNext,
  hasPrev,
  onNext,
  onPrev,
}: {
  hasNext?: boolean;
  hasPrev?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  return (
    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
      <button
        onClick={() => hasPrev && onPrev?.()}
        disabled={!hasPrev}
        className={`flex justify-center items-center gap-2 bg-white/20 size-14 rounded-full transition [&_svg]:size-10 ${
          hasPrev
            ? "text-white/70 hover:text-white cursor-pointer"
            : "text-white/30 cursor-not-allowed"
        }`}
      >
        <ArrowDownIcon className="rotate-180" />
      </button>
      <button
        onClick={() => hasNext && onNext?.()}
        disabled={!hasNext}
        className={`flex justify-center items-center gap-2 bg-white/20 size-14 rounded-full transition [&_svg]:size-10 ${
          hasNext
            ? "text-white/70 hover:text-white cursor-pointer"
            : "text-white/30 cursor-not-allowed"
        }`}
      >
        <ArrowDownIcon />
      </button>
    </div>
  );
}

/** Full-screen reel shell — dark overlay, close button, sidebar slot, main slot */
export function ReelShell({
  onClose,
  sidebar,
  children,
}: {
  onClose: () => void;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 text-white backdrop-blur-sm h-[100vh]">
      {sidebar}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Uploader row shown at the bottom of every reel sidebar / content area */
export function UploaderRow({
  avatarSrc,
  name,
  time,
}: {
  avatarSrc?: string;
  name?: string;
  time?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AppAvatar src={avatarSrc || ""} alt={name || ""} className="size-5" />
        <span className="text-sm text-white/80">{name || "Unknown User"}</span>
      </div>
      {time && <div className="text-xs text-white/50">{time}</div>}
    </div>
  );
}

/** Location + polling unit info block */
export function LocationBlock({
  pollingUnitName,
  locationStr,
}: {
  pollingUnitName?: string;
  locationStr?: string;
}) {
  return (
    <div className="space-y-1">
      {pollingUnitName && (
        <h3 className="leading-5 font-medium text-white">{pollingUnitName}</h3>
      )}
      {locationStr && <p className="text-sm text-white/60">{locationStr}</p>}
    </div>
  );
}

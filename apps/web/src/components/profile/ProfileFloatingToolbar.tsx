import { useState } from "react";
import { MoreHorizontal, PencilRuler, Settings } from "lucide-react";

export function ProfileFloatingToolbar() {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-5 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-sidebar-mobile/50 px-1 shadow-xs">
        <button
          type="button"
          title="Civic & Endorsement Actions"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          <PencilRuler className="size-5" />
        </button>

        <button
          type="button"
          title="Profile Settings"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          <Settings className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleShare}
          title="Share profile link"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer relative bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          {copied ? (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-c-100 text-background text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
              Copied!
            </span>
          ) : null}
          <MoreHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}

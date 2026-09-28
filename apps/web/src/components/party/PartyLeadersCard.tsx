import { HeaderAccent } from "@repo/ui/components/header-accent";
import type { PartyLeader } from "./types";

interface PartyLeadersCardProps {
  title?: string;
  leaders: PartyLeader[];
}

export function PartyLeadersCard({ title = "National leaders", leaders }: PartyLeadersCardProps) {
  return (
    <div className="space-y-4">
      {/* Header with underline accent mark */}
      <div className="relative">
        <div className="relative text-base sm:text-xl font-bold tracking-wide text-foreground z-2">
          {title}
        </div>
        <HeaderAccent />
      </div>

      {/* Card container */}
      <div className="bg-sidebar-mobile/50 rounded-[50px] p-6 sm:p-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
          {leaders.map((leader) => (
            <div key={leader.id} className="flex flex-col items-center group">
              <div className="size-16 sm:size-20 md:size-35 rounded-full overflow-hidden bg-muted shadow-xs transition-transform duration-300 group-hover:scale-105">
                <img src={leader.avatar} alt={leader.name} className="w-full h-full object-cover" />
              </div>
              <span className="mt-3 text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                {leader.role}
              </span>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                {leader.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

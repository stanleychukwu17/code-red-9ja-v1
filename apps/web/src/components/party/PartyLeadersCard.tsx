import type { PartyLeader } from "./types";

interface PartyLeadersCardProps {
  title?: string;
  accentColor?: string;
  leaders: PartyLeader[];
}

export function PartyLeadersCard({
  title = "National leaders",
  accentColor = "#A3E635",
  leaders,
}: PartyLeadersCardProps) {
  return (
    <div className="space-y-4">
      {/* Header with underline accent mark */}
      <div className="flex items-center">
        <span className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
          {title}
        </span>
        <div
          className="ml-1.5 h-1.5 w-16 rounded-full self-end mb-1"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Card container */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-900/60 rounded-3xl p-6 sm:p-8 border border-neutral-100 dark:border-neutral-800/80 shadow-xs">
        <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
          {leaders.map((leader) => (
            <div key={leader.id} className="flex flex-col items-center group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-xs transition-transform duration-300 group-hover:scale-105">
                <img
                  src={leader.avatar}
                  alt={leader.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="mt-3 text-xs sm:text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                {leader.role}
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1 font-medium">
                {leader.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

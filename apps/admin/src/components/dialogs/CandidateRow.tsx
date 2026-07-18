import { X } from "lucide-react";
import { SelectParty } from "@repo/ui/components/selects/party-select";
import { getParties } from "#/lib/server/parties";

export interface CandidateType {
  id: number;
  first_name: string;
  avatar_url?: string;
  party_id?: number;
}

interface CandidateRowProps {
  candidate: CandidateType;
  index: number;
  onUpdateParty: (index: number, partyItem: any) => void;
  onRemove: (index: number) => void;
}

export function CandidateRow({
  candidate,
  index,
  onUpdateParty,
  onRemove,
}: CandidateRowProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="h-12 flex items-center justify-between transition">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center text-xs font-semibold text-c-70 shrink-0 overflow-hidden">
          {candidate.avatar_url ? (
            <img
              src={candidate.avatar_url}
              alt={candidate.first_name}
              className="size-full object-cover"
            />
          ) : (
            getInitials(candidate.first_name)
          )}
        </div>
        <span className="text-[15px] font-semibold text-c-80">
          {candidate.first_name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <SelectParty
          update={(partyItem) => onUpdateParty(index, partyItem)}
          fetchParties={getParties}
          className="h-9 w-32 text-sm"
          selectedId={
            candidate.party_id !== undefined
              ? String(candidate.party_id)
              : undefined
          }
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="size-10 flex items-center justify-center rounded-xl hover:bg-black/5 text-[#a0a0a0] hover:text-[#e11d48] transition cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}

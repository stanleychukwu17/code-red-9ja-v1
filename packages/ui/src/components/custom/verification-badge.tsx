import { BadgeCheck } from "lucide-react";
import React from "react";
import { cn } from "../../lib/utils";

interface VerificationBadgeProps {
  id?: number | string;
  title?: string;
  className?: string;
  fill?: string;
}

export const getVerificationColor = (id?: number | string) => {
  switch (Number(id)) {
    case 1: return "#d1ccc0"; // vip_verified
    case 2: return "#3B82F6"; // celebrity_verified (blue-500)
    case 3: return "#10B981"; // political_party_verified (emerald-500)
    case 4: return "#4834d4"; // politician_verified (blurple) https://flatuicolors.com/palette/au
    case 5: return "#F59E0B"; // organization_verified (amber-500)
    case 6: return "#95afc0"; // business_verified (soaring-e) https://flatuicolors.com/palette/au
    case 7: return "#c23616"; // national_official_verified (red-500)
    case 8: return "#F97316"; // zonal_official_verified (orange-500)
    case 9: return "#aaa69d"; // state_official_verified (hot-stone) from https://flatuicolors.com/palette/es
    case 10: return "#84CC16"; // lga_official_verified (lime-500)
    case 11: return "#c0b2e0"; // ward_official_verified 
    default: return "#d1ccc0"; // fallback
  }
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ id, title, className, fill }) => {
  const color = fill || getVerificationColor(id);
  const titleText = title || "Verified";

  return (
    <span title={titleText} >
      <BadgeCheck
        className={cn("size-[18px] text-white shrink-0", className)}
        fill={color}
      />
    </span>
  );
};

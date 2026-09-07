import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { PartyDropdown } from "../dropdowns/PartyDropdown";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { Link } from "@tanstack/react-router";
import { WEB_URL } from "@/lib/config";

export type PartyType = {
  id: number;
  short_name: string;
  name: string;
  logo: string;
  logo_file_id?: number;
  display_order?: number;
  puAgents?: string;
  is_verified?: boolean;
  verifications?: any[];
  color_hex?: string;
  dark_color_hex?: string;
};

export function PartyTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-45 shrink-0">Party</span>
        <span className="text-c-90">Name</span>
      </TileLeft>
      <TileRight>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function PartyTableTile({ data }: { data: PartyType }) {
  const partyLink = WEB_URL.parties.profile(data.short_name, data.id) as any;

  return (
    <TileRow>
      <TileLeft>
        <div className="flex items-center gap-10 w-45 shrink-0">
          <Link to={partyLink} target="_blank" className="shrink-0 relative">
            <img
              src={data.logo}
              alt={data.short_name}
              className="size-8 rounded-full object-cover shrink-0 bg-[#f2f2f2] border border-[#dfdfdf]"
            />
            {data.color_hex && (
              <span
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: data.color_hex }}
                title={`Color: ${data.color_hex}${data.dark_color_hex ? ` (Dark: ${data.dark_color_hex})` : ""}`}
              />
            )}
          </Link>
          <span className="text-c-90">
            <Link
              to={partyLink}
              target="_blank"
              className="hover:underline hover:text-c-100 transition-colors"
            >
              {data.short_name}
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-2 truncate w-full">
          <p className="truncate text-c-90">
            <Link
              to={partyLink}
              target="_blank"
              className="hover:underline hover:text-c-100 transition-colors"
            >
              {data.name}
            </Link>
          </p>
          {data.is_verified &&
            data.verifications &&
            data.verifications.length > 0 && (
              <div className="flex items-center gap-1 shrink-0 relative -bottom-px">
                {data.verifications.map((v: any) => (
                  <VerificationBadge
                    key={`${v.id}-${v.verification_type_id}`}
                    id={v.verification_type_id}
                    title={v.verification_title}
                  />
                ))}
              </div>
            )}
        </div>
      </TileLeft>
      <TileRight>
        <PartyDropdown data={data} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}

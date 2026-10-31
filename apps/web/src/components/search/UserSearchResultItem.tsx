import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import type { SearchedUserItem } from "#/lib/server/citizens";

/**
 * Displays an individual citizen search result row with avatar, name, verification badge,
 * handle, state of residence, and political party badge.
 */
export function UserSearchResultItem({ person }: { person: SearchedUserItem }) {
  const navigate = useNavigate();

  const firstName = person.first_name || "";
  const lastName = person.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Citizen";
  const username = person.username || `user_${person.id}`;
  const avatar = person.avatar || "";
  const isPolitician = Boolean(person.is_politician);
  const isVerified = Boolean(person.is_verified);
  const stateName = person.state_name || "";
  const partyInfo = person.party_basic_info;

  const partyLogo = partyInfo?.logo;
  const verifications = person.verifications || [];

  const handleGoToProfile = () => {
    navigate({
      to: `/profile/${encodeURIComponent(username)}`,
    });
  };

  return (
    <div
      onClick={handleGoToProfile}
      className="group flex items-center justify-between gap-4 py-2.5 px-3 rounded-2xl transition hover:bg-sidebar-softer cursor-pointer"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={fullName}
            className="size-14 rounded-full object-cover"
          />
          {partyLogo ? (
            <img
              src={partyLogo}
              alt={partyInfo?.name || partyInfo?.short_name || "Party Logo"}
              title={partyInfo?.name || partyInfo?.short_name || "Party"}
              className="absolute -bottom-1 -right-1 size-5.5 rounded-full object-cover border-2 border-background shadow-sm"
            />
          ) : null}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-c-100 truncate group-hover:text-primary transition-colors">
              {fullName}
            </p>
            {isVerified && verifications.length > 0 ? (
              <p className="inline-flex items-center gap-px shrink-0">
                {verifications.map((v) => (
                  <VerificationBadge
                    key={`${v.id}-${v.verification_type_id}`}
                    id={v.verification_type_id}
                    title={v.verification_title}
                    className="size-4 shrink-0"
                  />
                ))}
              </p>
            ) : null}
            {isPolitician ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Politician
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[13px] text-c-50 truncate">
            <span>@{username}</span>
            {stateName ? (
              <>
                <span className="inline-block size-1 rounded-full bg-c-30" />
                <span className="truncate">{stateName}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

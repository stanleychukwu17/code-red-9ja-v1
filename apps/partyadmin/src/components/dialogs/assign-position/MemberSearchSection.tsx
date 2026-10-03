/**
 * @file Member Search and Selection Section
 * @description Provides a live search bar, selected member confirmation chip,
 * and a scrollable member directory to select a member for appointment.
 */

import * as React from "react";
import { Search } from "lucide-react";

interface MemberSearchSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedUserId?: number;
  selectedUserName: string;
  onSelectMember: (user: { id: number; name: string }) => void;
  onClearMember: () => void;
  membersList: any[];
  isLoading: boolean;
}

export function MemberSearchSection({
  searchQuery,
  onSearchChange,
  selectedUserId,
  selectedUserName,
  onSelectMember,
  onClearMember,
  membersList,
  isLoading,
}: MemberSearchSectionProps) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-c-80 mb-2">
        3. Select Party Member
      </label>

      {/* Search Input */}
      <div className="relative mb-2">
        <Search className="size-4 text-c-40 absolute left-3 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search member by name, username or email..."
          className="w-full h-10 pl-9 pr-3 text-[14px] rounded-xl border border-border bg-background text-c-90 placeholder:text-c-40 focus:outline-none focus:ring-1 focus:ring-orange"
        />
      </div>

      {/* Selected Member Active Pill */}
      {selectedUserId && (
        <div className="flex items-center justify-between p-2.5 mb-2 bg-green/10 border border-green/30 rounded-xl text-[13px] text-green dark:text-light-green">
          <span>
            Selected: <strong>{selectedUserName}</strong>
          </span>
          <button
            type="button"
            onClick={onClearMember}
            className="text-red hover:text-red-accent font-medium transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Member Results List */}
      <div className="max-h-36 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {isLoading ? (
          <div className="p-3 text-center text-[13px] text-c-40">Loading members...</div>
        ) : membersList.length === 0 ? (
          <div className="p-3 text-center text-[13px] text-c-40">No members found.</div>
        ) : (
          membersList.map((user: any) => {
            const name =
              [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ") ||
              user.username ||
              `User #${user.id}`;
            const isSelected = selectedUserId === user.id;

            return (
              <div
                key={user.id}
                onClick={() => onSelectMember({ id: user.id, name })}
                className={`flex items-center justify-between p-2.5 cursor-pointer text-[13px] transition ${
                  isSelected ? "bg-orange/10 text-orange font-medium" : "hover:bg-hover-3 text-c-80"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="size-6 rounded-full bg-c-10 text-c-70 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {user.first_name?.charAt(0) || "U"}
                  </div>
                  <span className="font-medium truncate">{name}</span>
                  {user.username && <span className="text-c-40 truncate">@{user.username}</span>}
                </div>
                <span className="text-[12px] text-c-40 capitalize">
                  {user.membership_status || user.account_status || "Active"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

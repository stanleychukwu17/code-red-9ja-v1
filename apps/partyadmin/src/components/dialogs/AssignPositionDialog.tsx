/**
 * @file Assign Party Position Dialog
 * @description Allows party administrators to appoint and assign registered members to standard
 * or custom positions across all chapter tiers (National, Zonal, State, LGA, Ward).
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserCheck, ShieldCheck, MapPin, Search } from "lucide-react";
import {
  getPartyPositions,
  resolvePartyChapter,
  assignPartyOfficial,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import { getUsersList } from "#/lib/server/users";

export function AssignPositionDialog({
  open,
  onClose,
  partyId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  partyId?: number;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  // Step 1: Chapter Hierarchy Selection
  const [chapterType, setChapterType] = React.useState<"national" | "zonal" | "state" | "lga" | "ward">("national");
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>(undefined);
  const [selectedLgaId, setSelectedLgaId] = React.useState<number | undefined>(undefined);
  const [selectedWardId, setSelectedWardId] = React.useState<number | undefined>(undefined);

  // Step 2: Position & Member Selection
  const [selectedPositionId, setSelectedPositionId] = React.useState<number | undefined>(undefined);
  const [memberSearch, setMemberSearch] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<number | undefined>(undefined);
  const [selectedUserName, setSelectedUserName] = React.useState<string>("");

  // Step 3: Appointment Details
  const [appointmentType, setAppointmentType] = React.useState<"substantive" | "acting" | "caretaker" | "interim">("substantive");
  const [tenureStart, setTenureStart] = React.useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [tenureEnd, setTenureEnd] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch States (for State, LGA, and Ward chapters)
  const { data: statesRes } = useQuery({
    queryKey: ["states", 161],
    queryFn: () => getStates({ data: { countryId: 161, limit: 50 } }),
    enabled: open && ["state", "lga", "ward"].includes(chapterType),
  });
  const statesList = Array.isArray(statesRes?.data?.states) ? statesRes.data.states : [];

  // Fetch LGAs when State is selected
  const { data: lgasRes } = useQuery({
    queryKey: ["lgas", selectedStateId],
    queryFn: () => getLGAs({ data: { stateId: selectedStateId } }),
    enabled: open && ["lga", "ward"].includes(chapterType) && !!selectedStateId,
  });
  const lgasList = Array.isArray(lgasRes?.data) ? lgasRes.data : [];

  // Fetch Wards when LGA is selected
  const { data: wardsRes } = useQuery({
    queryKey: ["wards", selectedLgaId],
    queryFn: () => getWards({ data: { lga_id: selectedLgaId } }),
    enabled: open && chapterType === "ward" && !!selectedLgaId,
  });
  const wardsList = Array.isArray(wardsRes?.data) ? wardsRes.data : [];

  // Fetch Positions applicable to current chapter tier
  const { data: positionsRes, isLoading: isPositionsLoading } = useQuery({
    queryKey: ["partyPositions", partyId, chapterType],
    queryFn: () =>
      getPartyPositions({
        data: { partyId: partyId!, chapterType },
      }),
    enabled: !!partyId && open,
  });
  const positions: PartyPositionItem[] = positionsRes?.data?.positions || [];

  // Fetch Party Members for selection
  const { data: membersRes, isLoading: isMembersLoading } = useQuery({
    queryKey: ["partyMembersList", partyId, memberSearch],
    queryFn: () =>
      getUsersList({
        data: {
          party_id: partyId,
          search: memberSearch.trim() || undefined,
          limit: 30,
        },
      }),
    enabled: !!partyId && open,
  });
  const membersList = Array.isArray(membersRes?.data?.users) ? membersRes.data.users : [];

  // Reset dependent fields when chapterType changes
  const handleChapterTypeChange = (type: "national" | "zonal" | "state" | "lga" | "ward") => {
    setChapterType(type);
    setSelectedStateId(undefined);
    setSelectedLgaId(undefined);
    setSelectedWardId(undefined);
    setSelectedPositionId(undefined);
  };

  const handleStateChange = (id: number) => {
    setSelectedStateId(id);
    setSelectedLgaId(undefined);
    setSelectedWardId(undefined);
  };

  const handleLgaChange = (id: number) => {
    setSelectedLgaId(id);
    setSelectedWardId(undefined);
  };

  // Submit Handler
  const handleAssign = async () => {
    if (!partyId) {
      toast.error("Party context is missing.");
      return;
    }
    if (!selectedPositionId) {
      toast.error("Please select a position.");
      return;
    }
    if (!selectedUserId) {
      toast.error("Please select a member to appoint.");
      return;
    }

    // Determine entity ID for chapter resolution
    let entityId: number | undefined = undefined;
    if (chapterType === "state") {
      if (!selectedStateId) {
        toast.error("Please select a state.");
        return;
      }
      entityId = selectedStateId;
    } else if (chapterType === "lga") {
      if (!selectedLgaId) {
        toast.error("Please select an LGA.");
        return;
      }
      entityId = selectedLgaId;
    } else if (chapterType === "ward") {
      if (!selectedWardId) {
        toast.error("Please select a ward.");
        return;
      }
      entityId = selectedWardId;
    }

    try {
      setIsSubmitting(true);

      // 1. Resolve or create the chapter ID
      const chapterRes = await resolvePartyChapter({
        data: {
          partyId,
          chapterType,
          entityId,
        },
      });

      if (!chapterRes?.success || !chapterRes?.data?.chapter_id) {
        throw new Error(chapterRes?.message || "Failed to resolve chapter for this tier.");
      }

      const chapterId = chapterRes.data.chapter_id;

      // 2. Assign the official
      const assignRes = await assignPartyOfficial({
        data: {
          partyId,
          chapterId,
          userId: selectedUserId,
          positionId: selectedPositionId,
          appointmentType,
          tenureStart: tenureStart || undefined,
          tenureEnd: tenureEnd || undefined,
        },
      });

      if (!assignRes?.success) {
        throw new Error(assignRes?.message || "Failed to assign position.");
      }

      toast.success("Official appointed successfully!");
      queryClient.invalidateQueries({ queryKey: ["partyOfficials"] });
      queryClient.invalidateQueries({ queryKey: ["chapterOfficials"] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign position.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader
          title="Appoint Party Official"
          description="Assign a registered party member to an executive or leadership position within a chapter tier."
        />

        <DialogPadding className="space-y-6 py-4">
          {/* Chapter Level Selector */}
          <div>
            <label className="block text-[14px] font-semibold text-c-80 mb-2">
              1. Select Chapter Tier
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(["national", "zonal", "state", "lga", "ward"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handleChapterTypeChange(tier)}
                  className={`py-2 px-3 text-[13px] font-medium rounded-xl border transition capitalize ${
                    chapterType === tier
                      ? "bg-[#ff9a3c] text-white border-[#ff9a3c] shadow-sm"
                      : "bg-[#f9fafb] text-c-70 border-[#e5e7eb] hover:bg-[#f3f4f6]"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Geographic Entity Pickers (State / LGA / Ward) */}
          {["state", "lga", "ward"].includes(chapterType) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#fbfbfb] rounded-xl border border-[#ebebeb]">
              <div>
                <label className="block text-[12px] font-medium text-c-60 mb-1">State</label>
                <select
                  value={selectedStateId || ""}
                  onChange={(e) => handleStateChange(Number(e.target.value))}
                  className="w-full h-10 px-3 text-[14px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
                >
                  <option value="">Select State</option>
                  {statesList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {["lga", "ward"].includes(chapterType) && (
                <div>
                  <label className="block text-[12px] font-medium text-c-60 mb-1">LGA</label>
                  <select
                    value={selectedLgaId || ""}
                    onChange={(e) => handleLgaChange(Number(e.target.value))}
                    disabled={!selectedStateId}
                    className="w-full h-10 px-3 text-[14px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c] disabled:opacity-50"
                  >
                    <option value="">Select LGA</option>
                    {lgasList.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {chapterType === "ward" && (
                <div>
                  <label className="block text-[12px] font-medium text-c-60 mb-1">Ward</label>
                  <select
                    value={selectedWardId || ""}
                    onChange={(e) => setSelectedWardId(Number(e.target.value))}
                    disabled={!selectedLgaId}
                    className="w-full h-10 px-3 text-[14px] rounded-lg border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c] disabled:opacity-50"
                  >
                    <option value="">Select Ward</option>
                    {wardsList.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Position Selector */}
          <div>
            <label className="block text-[14px] font-semibold text-c-80 mb-2">
              2. Select Position / Office
            </label>
            {isPositionsLoading ? (
              <div className="flex items-center gap-2 text-c-50 text-[14px] py-2">
                <Loader2 className="size-4 animate-spin" /> Loading positions...
              </div>
            ) : positions.length === 0 ? (
              <p className="text-[13px] text-amber-600 bg-amber-50 p-3 rounded-lg">
                No positions configured for the {chapterType} level.
              </p>
            ) : (
              <select
                value={selectedPositionId || ""}
                onChange={(e) => setSelectedPositionId(Number(e.target.value))}
                className="w-full h-11 px-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
              >
                <option value="">Choose a position...</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} ({pos.position_type === "custom" ? "Custom" : "Standard"} - Max: {pos.max_occupants})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Member Picker */}
          <div>
            <label className="block text-[14px] font-semibold text-c-80 mb-2">
              3. Select Party Member
            </label>
            <div className="relative mb-2">
              <Search className="size-4 text-c-40 absolute left-3 top-3.5" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member by name, username or email..."
                className="w-full h-10 pl-9 pr-3 text-[14px] rounded-xl border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
              />
            </div>

            {selectedUserId && (
              <div className="flex items-center justify-between p-2.5 mb-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[13px] text-[#166534]">
                <span>Selected: <strong>{selectedUserName}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId(undefined);
                    setSelectedUserName("");
                  }}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="max-h-36 overflow-y-auto rounded-xl border border-[#e5e7eb] divide-y divide-[#f3f4f6]">
              {isMembersLoading ? (
                <div className="p-3 text-center text-[13px] text-c-40">Loading members...</div>
              ) : membersList.length === 0 ? (
                <div className="p-3 text-center text-[13px] text-c-40">No members found.</div>
              ) : (
                membersList.map((user: any) => {
                  const name = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ") || user.username || "User #" + user.id;
                  const isSelected = selectedUserId === user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedUserName(name);
                      }}
                      className={`flex items-center justify-between p-2.5 cursor-pointer text-[13px] transition ${
                        isSelected ? "bg-[#fff7ed] text-[#ea580c]" : "hover:bg-[#f9fafb] text-c-80"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="size-6 rounded-full bg-gray-200 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {user.first_name?.charAt(0) || "U"}
                        </div>
                        <span className="font-medium truncate">{name}</span>
                        {user.username && <span className="text-c-40 truncate">@{user.username}</span>}
                      </div>
                      <span className="text-[12px] text-c-40 capitalize">{user.membership_status || user.account_status || "Active"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Appointment Type & Tenure Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-c-70 mb-1">
                Appointment Type
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as any)}
                className="w-full h-10 px-3 text-[13px] rounded-xl border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
              >
                <option value="substantive">Substantive (Permanent)</option>
                <option value="acting">Acting</option>
                <option value="caretaker">Caretaker</option>
                <option value="interim">Interim</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-c-70 mb-1">
                Tenure Start
              </label>
              <input
                type="date"
                value={tenureStart}
                onChange={(e) => setTenureStart(e.target.value)}
                className="w-full h-10 px-3 text-[13px] rounded-xl border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-c-70 mb-1">
                Tenure End <span className="text-c-40 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={tenureEnd}
                onChange={(e) => setTenureEnd(e.target.value)}
                className="w-full h-10 px-3 text-[13px] rounded-xl border border-[#d1d5db] bg-white focus:outline-none focus:ring-1 focus:ring-[#ff9a3c]"
              />
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="flex items-center justify-end gap-3 p-4 border-t border-[#ebebeb]">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedPositionId || !selectedUserId}
            className="bg-[#ff9a3c] hover:bg-[#e0832c] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Appointing...
              </>
            ) : (
              "Confirm Appointment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

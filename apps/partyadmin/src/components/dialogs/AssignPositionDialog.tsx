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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  getPartyPositions,
  resolvePartyChapter,
  assignPartyOfficial,
  type PartyPositionItem,
} from "#/lib/server/parties";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import { getUsersList } from "#/lib/server/users";
import {
  ChapterHierarchySection,
  PositionSelectSection,
  MemberSearchSection,
  AppointmentDetailsSection,
  type ChapterType,
  type AppointmentType,
} from "./assign-position";

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
  const [chapterType, setChapterType] = React.useState<ChapterType>("national");
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>(undefined);
  const [selectedLgaId, setSelectedLgaId] = React.useState<number | undefined>(undefined);
  const [selectedWardId, setSelectedWardId] = React.useState<number | undefined>(undefined);

  // Step 2: Position & Member Selection
  const [selectedPositionId, setSelectedPositionId] = React.useState<number | undefined>(undefined);
  const [memberSearch, setMemberSearch] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<number | undefined>(undefined);
  const [selectedUserName, setSelectedUserName] = React.useState<string>("");

  // Step 3: Appointment Details
  const [appointmentType, setAppointmentType] = React.useState<AppointmentType>("substantive");
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
  const handleChapterTypeChange = (type: ChapterType) => {
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
          {/* Step 1: Chapter Hierarchy Selection */}
          <ChapterHierarchySection
            chapterType={chapterType}
            onChapterTypeChange={handleChapterTypeChange}
            selectedStateId={selectedStateId}
            onStateChange={handleStateChange}
            selectedLgaId={selectedLgaId}
            onLgaChange={handleLgaChange}
            selectedWardId={selectedWardId}
            onWardChange={setSelectedWardId}
            statesList={statesList}
            lgasList={lgasList}
            wardsList={wardsList}
          />

          {/* Step 2: Position Selection */}
          <PositionSelectSection
            chapterType={chapterType}
            positions={positions}
            isLoading={isPositionsLoading}
            selectedPositionId={selectedPositionId}
            onSelectPosition={setSelectedPositionId}
          />

          {/* Step 3: Member Selection */}
          <MemberSearchSection
            searchQuery={memberSearch}
            onSearchChange={setMemberSearch}
            selectedUserId={selectedUserId}
            selectedUserName={selectedUserName}
            onSelectMember={(user) => {
              setSelectedUserId(user.id);
              setSelectedUserName(user.name);
            }}
            onClearMember={() => {
              setSelectedUserId(undefined);
              setSelectedUserName("");
            }}
            membersList={membersList}
            isLoading={isMembersLoading}
          />

          {/* Step 4: Appointment Details & Tenure */}
          <AppointmentDetailsSection
            appointmentType={appointmentType}
            onAppointmentTypeChange={setAppointmentType}
            tenureStart={tenureStart}
            onTenureStartChange={setTenureStart}
            tenureEnd={tenureEnd}
            onTenureEndChange={setTenureEnd}
          />
        </DialogPadding>

        <DialogFooter className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="orange"
            onClick={handleAssign}
            disabled={isSubmitting || !selectedPositionId || !selectedUserId}
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

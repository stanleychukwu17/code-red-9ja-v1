import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldPartyCandidate } from "#/lib/server/elections";
import { getUsersList } from "#/lib/server/users";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Trash2, UsersIcon } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { UserFinderCommand } from "@repo/ui/components/custom/UserFinderCommand";
import { useAuth } from "#/hooks/useAppContext";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";

interface PartyElectionInstanceDropdownProps {
  data: ElectionInstanceType;
  className?: string;
}

export const PartyElectionInstanceDropdown = ({
  data,
  className,
}: PartyElectionInstanceDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openFinderDialog, setOpenFinderDialog] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userPartyId = user?.party?.id ?? (user as any)?.party_id;

  const mutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await fieldPartyCandidate({
        data: {
          electionId: data.id,
          candidateId,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update candidate");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
    },
  });

  const handleFieldCandidate = (selectedUsers: any[]) => {
    if (selectedUsers.length > 0) {
      mutation.mutate(selectedUsers[0].id);
    }
  };

  const handleRemoveCandidate = () => {
    mutation.mutate(0);
    setOpenMenu(false);
  };

  const dropdownData: TDropdownGroup[] = [
    [
      {
        title: data.candidate ? "Change Candidate" : "Field Candidate",
        icon: <UsersIcon className="size-4" />,
        action: () => {
          setOpenMenu(false);
          setOpenFinderDialog(true);
        },
      },
      ...(data.candidate
        ? [
            {
              title: "Remove Candidate",
              icon: <Trash2 className="size-4 text-red-600" />,
              action: handleRemoveCandidate,
              className: "text-red-600 [&_svg]:text-red-600",
            },
          ]
        : []),
    ],
  ];

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <UserFinderCommand
        open={openFinderDialog}
        onClose={() => setOpenFinderDialog(false)}
        onAddUsers={handleFieldCandidate}
        alreadySelectedIds={data.candidate ? [Number(data.candidate.id)] : []}
        fetchUsers={async ({ cursor, search }) => {
          const res = await getUsersList({
            data: {
              party_id: userPartyId,
              cursor,
              search,
              limit: 20,
            },
          });
          if (res && res.success && res.data?.users) {
            return {
              users: res.data.users,
              nextCursor: res.data.meta?.next_cursor,
            };
          }
          return { users: [] };
        }}
        filterPartyId={userPartyId}
        title="Field Candidate"
        placeholder="Search party members..."
      />
    </>
  );
};

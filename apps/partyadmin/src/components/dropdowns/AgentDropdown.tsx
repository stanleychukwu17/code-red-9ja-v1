import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { UserCheck } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { ChangeRoleDialog } from "../dialogs/change-role-dialog";
import { revokeAgentAssignment, type AgentPerformanceItem } from "#/lib/server/agents";

interface AgentDropdownProps {
  data: AgentPerformanceItem;
  className?: string;
  refetch?: () => void;
}

export const AgentDropdown = ({ data, className, refetch }: AgentDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openChangeRoleDialog, setOpenChangeRoleDialog] = useState(false);
  const [openRevokeAlert, setOpenRevokeAlert] = useState(false);
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const res = await revokeAgentAssignment({
        data: {
          id: data.id,
          roleType: data.role_type,
          partyId: data.party_id,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to revoke assignment");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-performance"] });
      refetch?.();
      setOpenRevokeAlert(false);
    },
  });

  const getRoleTitle = (role: string) => {
    switch (role) {
      case "polling_agent":
      case "pu_agent":
        return "Polling Agent";
      case "ward_supervisor":
      case "ward_election_supervisor":
        return "Ward Supervisor";
      case "lga_supervisor":
      case "lga_election_supervisor":
        return "LGA Supervisor";
      case "state_supervisor":
      case "state_election_supervisor":
        return "State Supervisor";
      default:
        return "Agent";
    }
  };

  const group: TDropdownGroup = [
    {
      title: "Change role",
      icon: <UserCheck className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenChangeRoleDialog(true);
      },
    },
    {
      title: "Revoke assignment",
      icon: <TrashcanIcon />,
      action: () => {
        setOpenMenu(false);
        setOpenRevokeAlert(true);
      },
      className: "[&_svg]:text-red text-red",
    },
  ];

  const dropdownData: TDropdownGroup[] = [group];

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <ChangeRoleDialog
        open={openChangeRoleDialog}
        onClose={() => setOpenChangeRoleDialog(false)}
        data={data}
        refetch={refetch}
      />

      <DeleteAlertDialog
        open={openRevokeAlert}
        setOpen={setOpenRevokeAlert}
        delete={() => revokeMutation.mutate()}
        isPending={revokeMutation.isPending}
        title="Revoke Assignment"
        subtitle={`Are you sure you want to remove "${data.user_name}" from their role as ${getRoleTitle(data.role_type)}? This will free up the assignment.`}
      />
    </>
  );
};

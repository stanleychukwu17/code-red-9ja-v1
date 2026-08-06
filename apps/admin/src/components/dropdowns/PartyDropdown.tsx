import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteParty,
  updatePartyStateAllowances,
  getPartyAgentPaymentAllocation,
} from "#/lib/server/parties";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Target } from "lucide-react";
import { Pencil, Award } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { PartyFormDialog } from "../dialogs/PartyFormDialog";
import { UserBadgeDialog } from "../dialogs/UserBadgeDialog";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";
import { AgentPaymentAllocationFormDialog } from "@repo/ui/components/dialogs/AgentPaymentAllocationFormDialog";
import type { PartyType } from "../tiles/party-tile";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface PartyDropdownProps {
  data: PartyType;
  className?: string;
}

export const PartyDropdown = ({ data, className }: PartyDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBadgeDialog, setOpenBadgeDialog] = useState(false);
  const [openTargetDialog, setOpenTargetDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteParty({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete party");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      setOpenDeleteAlert(false);
    },
  });

  const group1: TDropdownGroup = [
    {
      title: "Edit",
      icon: <Pencil className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenEditDialog(true);
      },
    },
    {
      title: "Add/Edit badge",
      icon: <Award className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenBadgeDialog(true);
      },
      className: "cursor-pointer!",
    },
    {
      title: "Set Targets",
      icon: <Target className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenTargetDialog(true);
      },
    },
    {
      title: "Agent Payment",
      icon: <Wallet className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenPaymentDialog(true);
      },
    },
    {
      title: "Delete",
      icon: <TrashcanIcon />,
      action: () => {
        setOpenMenu(false);
        setOpenDeleteAlert(true);
      },
      className: "[&_svg]:text-red text-red",
    },
  ];
  const dropdownData: TDropdownGroup[] = [group1];

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <PartyFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        party={data}
      />

      <UserBadgeDialog
        open={openBadgeDialog}
        onClose={() => setOpenBadgeDialog(false)}
        page={data}
        forWho="party"
      />

      <TargetFormDialog
        open={openTargetDialog}
        onClose={() => setOpenTargetDialog(false)}
        onSubmit={(values) => {
          console.log("Targets submitted", values);
          setOpenTargetDialog(false);
        }}
      />

      <AgentPaymentAllocationFormDialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        partyId={data.id}
        fetchAllocation={async (partyId) => {
          const res = await getPartyAgentPaymentAllocation({ data: partyId });
          return res?.data?.agent_payment_allocation ?? null;
        }}
        updateAllocation={async (partyId, values) => {
          const res = await updatePartyStateAllowances({
            data: { partyID: partyId, allowances: values as any },
          });
          if (!res.success) throw new Error(res.message || "Failed to update");
          queryClient.invalidateQueries({ queryKey: ["parties"] });
          toast.success("Agent payment budget saved!");
          return res.data;
        }}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Party"
        subtitle={`Are you sure you want to permanently delete the party "${data.name}" (${data.short_name})? This action cannot be undone.`}
      />
    </>
  );
};

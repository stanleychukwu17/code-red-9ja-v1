import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteParty,
  togglePartyVerification,
  getPartyAgentTargets,
  updatePartyAgentTargets,
} from "#/lib/server/parties";
import { QUERY_KEYS } from "#/lib/config";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Target, Award } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { PartyFormDialog } from "../dialogs/PartyFormDialog";
import { UserBadgeDialog } from "../dialogs/UserBadgeDialog";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";
import type { PartyType } from "../tiles/party-tile";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type PartyDropdownProps = {
  data: PartyType;
  className?: string;
};

export const PartyDropdown = ({ data, className }: PartyDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBadgeDialog, setOpenBadgeDialog] = useState(false);
  const [openTargetDialog, setOpenTargetDialog] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
      setOpenDeleteAlert(false);
    },
  });

  const toggleVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await togglePartyVerification({
        data: { id: data.id, is_verified: !data.is_verified },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to toggle verification");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
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
      title: data.is_verified ? "Un-verify Party" : "Verify Party",
      icon: <Award className="size-4" />,
      action: () => {
        setOpenMenu(false);
        toggleVerificationMutation.mutate();
      },
    },
    {
      title: "Targets",
      icon: <Target className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenTargetDialog(true);
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
        partyId={data.id}
        fetchTargets={async (partyId) => {
          const res = await getPartyAgentTargets({ data: partyId });
          return res?.data?.targets ?? null;
        }}
        updateTargets={async (partyId, values) => {
          const res = await updatePartyAgentTargets({
            data: { partyID: partyId, targets: values },
          });
          if (!res.success) throw new Error(res.message || "Failed to update targets");
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
          toast.success("Agent targets saved!");
          return res.data;
        }}
        onSuccess={() => {
          setOpenTargetDialog(false);
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

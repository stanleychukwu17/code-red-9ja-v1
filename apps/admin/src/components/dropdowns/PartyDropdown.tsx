import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteParty } from "#/lib/server/parties";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Target } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { PartyFormDialog } from "../dialogs/PartyFormDialog";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";
import { SetAgentPaymentDialog } from "@repo/ui/components/dialogs/set-agent-payment-dialog";
import type { PartyType } from "../tiles/party-tile";
import { updatePartyStateAllowances } from "#/lib/server/parties";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

interface PartyDropdownProps {
  data: PartyType;
  className?: string;
}

export const PartyDropdown = ({ data, className }: PartyDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openTargetDialog, setOpenTargetDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const statesList = [
    "Abia", "Abuja FCT", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
    "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi",
    "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
    "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
    "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
    "Sokoto", "Taraba", "Yobe", "Zamfara",
  ];

  const paymentMutation = useMutation({
    mutationFn: async (allowances: Record<string, Record<string, number>>) => {
      const res = await updatePartyStateAllowances({
        data: { partyID: data.id, allowances },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update allowances");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Agent payment budget saved successfully!");
      setOpenPaymentDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

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

      <TargetFormDialog
        open={openTargetDialog}
        onClose={() => setOpenTargetDialog(false)}
        onSubmit={(values) => {
          console.log("Targets submitted", values);
          setOpenTargetDialog(false);
        }}
      />

      <SetAgentPaymentDialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        defaultValues={(data as any).agent_payment_allocation}
        onSubmit={(values) => paymentMutation.mutate(values as any)}
        isPending={paymentMutation.isPending}
        statesList={statesList}
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

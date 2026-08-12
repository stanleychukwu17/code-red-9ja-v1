import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { CheckCircle, XCircle } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import type { MarketingCampaignType } from "../tiles/marketing-tile";
import {
  updatePartyMarketingCampaignStatus,
  deletePartyMarketingCampaign,
} from "#/lib/server/parties";
import { toast } from "sonner";

interface MarketingDropdownProps {
  data: MarketingCampaignType;
  className?: string;
}

export const MarketingDropdown = ({ data, className }: MarketingDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const isActive = data.status === "active";

  const statusMutation = useMutation({
    mutationFn: async () => {
      const targetStatus = isActive ? "pending" : "active";
      const res = await updatePartyMarketingCampaignStatus({
        data: { id: data.id, status: targetStatus },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update campaign status");
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        `Marketing campaign marked as ${isActive ? "inactive" : "active"}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-all-marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["party-marketing-campaigns"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deletePartyMarketingCampaign({ data: { id: data.id } });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete marketing campaign");
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Marketing campaign deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-marketing-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["party-marketing-campaigns"] });
      setOpenDeleteAlert(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete campaign");
    },
  });

  const toggleActiveStatus = () => {
    setOpenMenu(false);
    statusMutation.mutate();
  };

  const group1: TDropdownGroup = [
    {
      title: isActive ? "Set as Inactive" : "Set as active",
      icon: isActive ? <XCircle className="size-4" /> : <CheckCircle className="size-4" />,
      action: toggleActiveStatus,
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

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Marketing Campaign"
        subtitle={`Are you sure you want to delete this marketing campaign? This action cannot be undone.`}
      />
    </>
  );
};

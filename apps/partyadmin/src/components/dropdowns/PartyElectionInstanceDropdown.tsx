/**
 * @file Election Instance Candidate Assignment Dropdown
 * @description Contextual action menu for contested election race instances.
 * Enables party admins to open the ticket management dialog to field candidates and running mates.
 */

import { useState } from "react";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { UsersIcon } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { ManageCandidateTicketDialog } from "../dialogs/ManageCandidateTicketDialog";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";

type PartyElectionInstanceDropdownProps = {
  data: ElectionInstanceType;
  className?: string;
};

/**
 * PartyElectionInstanceDropdown Component
 * Contextual popover menu triggering nomination ticket management.
 */
export const PartyElectionInstanceDropdown = ({
  data,
  className,
}: PartyElectionInstanceDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openTicketDialog, setOpenTicketDialog] = useState(false);

  // Dropdown menu options
  const dropdownData: TDropdownGroup[] = [
    [
      {
        title: data.candidate ? "Manage Candidate Ticket" : "Field Candidate Ticket",
        icon: <UsersIcon className="size-4" />,
        action: () => {
          setOpenMenu(false);
          setOpenTicketDialog(true);
        },
      },
    ],
  ];

  return (
    <>
      {/* Three-dots contextual menu trigger */}
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      {/* Nomination ticket management dialog — rendered lazily on open */}
      {openTicketDialog && (
        <ManageCandidateTicketDialog
          open={openTicketDialog}
          onClose={() => setOpenTicketDialog(false)}
          data={data}
        />
      )}
    </>
  );
};

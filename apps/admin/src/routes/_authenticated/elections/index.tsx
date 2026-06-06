import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionGroupsTable } from "#/components/Tables";
import { NewElectionInstanceDialog } from "#/components/dialogs/NewElectionInstanceDialog";
import { CreateElectionTypeDialog } from "#/components/dialogs/CreateElectionTypeDialog";
import { ELECTION_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

const ELECTION_GROUPS = [
  {
    title: "2027 Presidential Election Group",
    badge: "Active",
    meta: ["470", "37", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
  {
    title: "2027 Governorship Election Group",
    badge: "Active",
    meta: ["992", "18", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
  {
    title: "2027 Local Government Area Election Group",
    badge: "Active",
    meta: ["360", "18", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
];

function RouteComponent() {
  const [isAddElectionOpen, setIsAddElectionOpen] = useState(false);
  const [isAddElectionTypeOpen, setIsAddElectionTypeOpen] = useState(false);

  return (
    <Layout>
      <PageHeader title="Elections" activeTab="groups" tabs={ELECTION_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton
              onAddElection={() => setIsAddElectionOpen(true)}
              onAddElectionType={() => setIsAddElectionTypeOpen(true)}
            />
          </>
        }
      />

      <ElectionGroupsTable items={ELECTION_GROUPS} />

      <NewElectionInstanceDialog
        open={isAddElectionOpen}
        onClose={() => setIsAddElectionOpen(false)}
      />
      <CreateElectionTypeDialog
        open={isAddElectionTypeOpen}
        onClose={() => setIsAddElectionTypeOpen(false)}
      />
    </Layout>
  );
}

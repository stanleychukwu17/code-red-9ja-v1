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
import { ElectionTypesTable } from "#/components/Tables";
import { NewElectionInstanceDialog } from "#/components/dialogs/NewElectionInstanceDialog";
import { CreateElectionTypeDialog } from "#/components/dialogs/CreateElectionTypeDialog";
import { ELECTION_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/elections/types")({
  head: () => getPageHeader({ title: "Election Types" }),
  component: RouteComponent,
});

const ELECTION_TYPES = [
  {
    title: "Presidential",
    subtitle: "National executive election",
    badge: "Active",
    meta: ["1", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
  {
    title: "Governorship",
    subtitle: "State executive election",
    badge: "Active",
    meta: ["36", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
  {
    title: "Senatorial",
    subtitle: "Upper legislative chamber election",
    badge: "Active",
    meta: ["109", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
  {
    title: "House of Representatives",
    subtitle: "Lower legislative chamber election",
    badge: "Active",
    meta: ["360", "Jan 16, 27"],
    rankIcon: "folder" as const,
  },
];

function RouteComponent() {
  const [isAddElectionOpen, setIsAddElectionOpen] = useState(false);
  const [isAddElectionTypeOpen, setIsAddElectionTypeOpen] = useState(false);

  return (
    <Layout>
      <PageHeader title="Elections" activeTab="types" tabs={ELECTION_TABS} />
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

      <ElectionTypesTable items={ELECTION_TYPES} />

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

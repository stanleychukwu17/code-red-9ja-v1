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
import { ElectionInstancesTable } from "#/components/Tables";
import { NewElectionInstanceDialog } from "#/components/dialogs/NewElectionInstanceDialog";
import { CreateElectionTypeDialog } from "#/components/dialogs/CreateElectionTypeDialog";
import { ELECTION_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/elections/instances")({
  head: () => getPageHeader({ title: "Election Instances" }),
  component: RouteComponent,
});

const ELECTION_INSTANCES = [
  {
    title: "Presidential",
    badge: "Active",
    meta: ["18", "Jan 16, 27"],
    rank: "1",
    rankIcon: "star" as const,
    rankIconColor: "text-[#25654c]",
  },
  {
    title: "Governorship Election (Abia)",
    badge: "Active",
    meta: ["13", "Jan 16, 27"],
    rank: "2",
    rankIcon: "star" as const,
    rankIconColor: "text-[#ffbf2e]",
  },
  {
    title: "Governorship Election (Adamawa)",
    badge: "Active",
    meta: ["0", "Jan 16, 27"],
    rank: "2",
    rankIcon: "star" as const,
    rankIconColor: "text-[#ffbf2e]",
  },
  {
    title: "Governorship Election (Akwa Ibom)",
    badge: "Active",
    meta: ["0", "Jan 16, 27"],
    rank: "2",
    rankIcon: "star" as const,
    rankIconColor: "text-[#ffbf2e]",
  },
  {
    title: "Senatorial Election (Abia North)",
    badge: "Active",
    meta: ["13", "Jan 16, 27"],
    rank: "3",
    rankIcon: "star" as const,
    rankIconColor: "text-[#00d87f]",
  },
  {
    title: "Senatorial Election (Abia Central)",
    badge: "Active",
    meta: ["8", "Jan 16, 27"],
    rank: "3",
    rankIcon: "star" as const,
    rankIconColor: "text-[#00d87f]",
  },
  {
    title: "Senatorial Election (Abia South)",
    badge: "Active",
    meta: ["0", "Jan 16, 27"],
    rank: "3",
    rankIcon: "star" as const,
    rankIconColor: "text-[#00d87f]",
  },
  {
    title: "House of Representative (Aba North / Aba South)",
    badge: "Active",
    meta: ["0", "Jan 16, 27"],
    rank: "3",
    rankIcon: "star" as const,
    rankIconColor: "text-[#00d87f]",
  },
];

function RouteComponent() {
  const [isAddElectionOpen, setIsAddElectionOpen] = useState(false);
  const [isAddElectionTypeOpen, setIsAddElectionTypeOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={ELECTION_TABS}
      />
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

      <ElectionInstancesTable items={ELECTION_INSTANCES} />

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

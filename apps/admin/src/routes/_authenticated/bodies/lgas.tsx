import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { Plus } from "lucide-react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { LgasTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/bodies/lgas")({
  head: () => getPageHeader({ title: "Bodies - LGAs" }),
  component: RouteComponent,
});

const LGAS_DATA = [
  { title: "Abaji", meta: ["4,238", "32", "Abuja (FCT)"] },
  { title: "Abuja Municipal (AMAC)", meta: ["4,238", "32", "Abuja (FCT)"] },
  { title: "Bwari", meta: ["4,238", "32", "Abuja (FCT)"] },
  { title: "Gwagwalada", meta: ["4,238", "32", "Abuja (FCT)"] },
  { title: "Kuje", meta: ["4,238", "32", "Abuja (FCT)"] },
  { title: "Kwali", meta: ["4,238", "32", "Abuja (FCT)"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="lgas" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <LgasTable items={LGAS_DATA} />
      {renderDialogs()}
    </Layout>
  );
}


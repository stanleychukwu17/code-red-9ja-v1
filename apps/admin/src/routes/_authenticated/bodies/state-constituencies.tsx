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
import { StateConstituenciesTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute(
  "/_authenticated/bodies/state-constituencies",
)({
  head: () => getPageHeader({ title: "Bodies - State Constituencies" }),
  component: RouteComponent,
});

const STATE_CONSTITUENCIES_DATA = [
  { title: "Bende North", meta: ["174", "Abia North", "Abia"] },
  { title: "Bende South", meta: ["174", "Abia North", "Abia"] },
  { title: "Isuikwuato", meta: ["174", "Abia North", "Abia"] },
  { title: "Umuahia East", meta: ["174", "Abia Central", "Abia"] },
  { title: "Umuahia North", meta: ["174", "Abia Central", "Abia"] },
  { title: "Ikwuano", meta: ["174", "Abia Central", "Abia"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader
        title="Bodies"
        activeTab="state-constituencies"
        tabs={BODIES_TABS}
      />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <StateConstituenciesTable items={STATE_CONSTITUENCIES_DATA} />
      {renderDialogs()}
    </Layout>
  );
}


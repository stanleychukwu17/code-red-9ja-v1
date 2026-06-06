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
import { StatesTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/bodies/states")({
  head: () => getPageHeader({ title: "Bodies - States" }),
  component: RouteComponent,
});

const STATES_DATA = [
  { title: "Abia", meta: ["9", "3", "32", "208", "32", "4,238"] },
  { title: "Adamawa", meta: ["9", "3", "32", "208", "32", "4,238"] },
  { title: "Akwa Ibom", meta: ["9", "3", "32", "208", "32", "4,238"] },
  { title: "Anambra", meta: ["9", "3", "32", "208", "32", "4,238"] },
  { title: "Bauchi", meta: ["9", "3", "32", "208", "32", "4,238"] },
  { title: "Bayelsa", meta: ["9", "3", "32", "208", "32", "4,238"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="states" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <StatesTable items={STATES_DATA} />
      {renderDialogs()}
    </Layout>
  );
}


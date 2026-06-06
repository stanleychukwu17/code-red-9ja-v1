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
import { PollingUnitsTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/bodies/polling-units")({
  head: () => getPageHeader({ title: "Bodies - Polling Units" }),
  component: RouteComponent,
});

const POLLING_UNITS_DATA = [
  {
    title: "36/14/01/001",
    meta: ["SO'DINGO II/BAKIN KASUWA", "Abaji Central", "Abaji", "Abuja (FCT)"],
  },
  {
    title: "36/14/01/022",
    meta: ["T/MADO / PRIMARY SCHOOL", "Abaji Central", "Abaji", "Abuja (FCT)"],
  },
  {
    title: "36/14/01/016",
    meta: ["BAICE / BACIRAWA", "Abaji Central", "Abaji", "Abuja (FCT)"],
  },
  {
    title: "36/14/01/023",
    meta: ["GIDAN DUWA/ BAKIN KASUWA", "Abaji Central", "Abaji", "Abuja (FCT)"],
  },
  {
    title: "36/14/01/018",
    meta: ["JAYA II/ASIBITI JAYA", "Abaji Central", "Abaji", "Abuja (FCT)"],
  },
  {
    title: "36/14/01/014",
    meta: [
      "SAGI / ADULT EDUCATION CLASS",
      "Abaji Central",
      "Abaji",
      "Abuja (FCT)",
    ],
  },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="polling-units" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <PollingUnitsTable items={POLLING_UNITS_DATA} />
      {renderDialogs()}
    </Layout>
  );
}


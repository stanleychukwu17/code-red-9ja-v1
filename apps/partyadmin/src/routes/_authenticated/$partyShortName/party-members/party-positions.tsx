/**
 * @file Party Positions Roster Page
 * @description Roster displaying party officials, executive positions, and leadership offices.
 * Lists national, zonal, and state executive positions with search filtering.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartyAdminsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs, getAllPartyAdmins } from "./-data";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members/party-positions")({
  head: () => getPageHeader({ title: "Party positions" }),
  component: RouteComponent,
});

/**
 * Party Positions Page Component
 * Renders party officials holding executive leadership and administration positions.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [searchQuery, setSearchQuery] = React.useState("");

  const allPositions = React.useMemo(() => {
    const list = getAllPartyAdmins(partyShortName);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.partyOffice.toLowerCase().includes(q) ||
        (item.role && item.role.toLowerCase().includes(q)),
    );
  }, [partyShortName, searchQuery]);

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="party-positions"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search party positions"
        placeholder="Search positions or officials"
      />

      {allPositions.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No party positions found.
        </div>
      ) : (
        <PartyAdminsTable
          columns={[
            "Party official",
            "Role",
            "Party position / office",
            "Joined at",
          ]}
          items={allPositions}
        />
      )}
    </Layout>
  );
}

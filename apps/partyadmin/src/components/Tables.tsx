import {
  ElectionGroupTableHeader,
  ElectionGroupTableTile,
  type ElectionGroupType,
} from "./tiles/election-group-tile";
import {
  ElectionInstanceTableHeader,
  ElectionInstanceTableTile,
  type ElectionInstanceType,
} from "./tiles/election-instance-tile";
import {
  ApplicationTableHeader,
  ApplicationTableTile,
  type ApplicationType,
} from "./tiles/application-tile";

export function ElectionGroupsTable({ items }: { items: ElectionGroupType[] }) {
  return (
    <div className="w-full">
      <ElectionGroupTableHeader />

      <div>
        {items.map((data) => (
          <ElectionGroupTableTile key={data.title} data={data} />
        ))}
      </div>
    </div>
  );
}

export function ElectionInstancesTable({
  items,
}: {
  items: ElectionInstanceType[];
}) {
  return (
    <div className="w-full">
      <ElectionInstanceTableHeader />

      <div>
        {items.map((data) => (
          <ElectionInstanceTableTile key={data.title} data={data} />
        ))}
      </div>
    </div>
  );
}

export function ApplicationsTable({ items }: { items: readonly ApplicationType[] }) {
  return (
    <div className="w-full">
      <ApplicationTableHeader />

      <div>
        {items.map((data, index) => (
          <ApplicationTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}

import {
  PartyMemberTableHeader,
  PartyMemberTableTile,
  type PartyMemberType,
} from "./tiles/party-member-tile";

export function PartyMembersTable({
  columns,
  items,
}: {
  columns: string[];
  items: readonly PartyMemberType[];
}) {
  return (
    <div className="w-full">
      <PartyMemberTableHeader columns={columns} />

      <div>
        {items.map((data, index) => (
          <PartyMemberTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}



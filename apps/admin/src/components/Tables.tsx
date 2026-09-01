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
  OfficeTableHeader,
  OfficeTableTile,
  type OfficeType,
} from "./tiles/office-tile";
import {
  StateTableHeader,
  StateTableTile,
  type StateType,
} from "./tiles/state-tile";
import {
  DistrictTableHeader,
  DistrictTableTile,
  type DistrictType,
} from "./tiles/district-tile";
import {
  FederalConstituencyTableHeader,
  FederalConstituencyTableTile,
  type FederalConstituencyType,
} from "./tiles/federal-constituency-tile";
import {
  StateConstituencyTableHeader,
  StateConstituencyTableTile,
  type StateConstituencyType,
} from "./tiles/state-constituency-tile";
import { LgaTableHeader, LgaTableTile, type LgaType } from "./tiles/lga-tile";
import {
  WardTableHeader,
  WardTableTile,
  type WardType,
} from "./tiles/ward-tile";
import {
  PollingUnitTableHeader,
  PollingUnitTableTile,
  type PollingUnitType,
} from "./tiles/polling-unit-tile";
import {
  UserTableHeader,
  UserTableTile,
  type UserType,
} from "./tiles/user-tile";
import {
  PartyTableHeader,
  PartyTableTile,
  type PartyType,
} from "./tiles/party-tile";
import {
  MarketingTableHeader,
  MarketingTableTile,
  type MarketingCampaignType,
} from "./tiles/marketing-tile";
import {
  INECGrabberTableHeader,
  INECGrabberTableTile,
  type INECResultGrabberType,
} from "./tiles/inec-grabber-tile";
import {
  INECGrabberLogTableHeader,
  INECGrabberLogTableTile,
  type INECResultGrabberLogType,
} from "./tiles/inec-grabber-log-tile";

export {
  type ElectionGroupType,
  type ElectionInstanceType,
  type OfficeType,
  type StateType,
  type DistrictType,
  type FederalConstituencyType,
  type StateConstituencyType,
  type LgaType,
  type WardType,
  type PollingUnitType,
  type UserType,
  type PartyType,
  type MarketingCampaignType,
};

export function ElectionGroupsTable({ items }: { items: ElectionGroupType[] }) {
  return (
    <div className="w-full">
      <ElectionGroupTableHeader />

      <div>
        {items.map((data) => (
          <ElectionGroupTableTile key={data.id} data={data} />
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
          <ElectionInstanceTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function OfficesTable({ items }: { items: OfficeType[] }) {
  return (
    <div className="w-full">
      <OfficeTableHeader />

      <div>
        {items.map((data, index) => (
          <OfficeTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}

export function StatesTable({ items }: { items: StateType[] }) {
  return (
    <div>
      <StateTableHeader />
      <div>
        {items.map((data) => (
          <StateTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function DistrictsTable({ items }: { items: DistrictType[] }) {
  return (
    <div>
      <DistrictTableHeader />
      <div>
        {items.map((data, index) => (
          <DistrictTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}

export function FederalConstituenciesTable({
  items,
}: {
  items: FederalConstituencyType[];
}) {
  return (
    <div>
      <FederalConstituencyTableHeader />
      <div>
        {items.map((data) => (
          <FederalConstituencyTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function StateConstituenciesTable({
  items,
}: {
  items: StateConstituencyType[];
}) {

  return (
    <div>
      <StateConstituencyTableHeader />
      <div>
        {items.map((data) => (
          <StateConstituencyTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function LgasTable({ items }: { items: LgaType[] }) {
  return (
    <div>
      <LgaTableHeader />
      <div>
        {items.map((data) => (
          <LgaTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function WardsTable({ items }: { items: WardType[] }) {
  return (
    <div>
      <WardTableHeader />
      <div>
        {items.map((data) => (
          <WardTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function PollingUnitsTable({ items }: { items: PollingUnitType[] }) {
  return (
    <div>
      <PollingUnitTableHeader />
      <div>
        {items.map((data) => (
          <PollingUnitTableTile key={data.id} data={data} />
        ))}
      </div>
    </div>
  );
}

export function UsersTable({
  items,
  refetch,
}: {
  items: UserType[];
  refetch?: () => void;
}) {
  return (
    <div className="w-full">
      <UserTableHeader />
      <div>
        {items.map((data, index) => (
          <UserTableTile
            key={`${data.name || data.id}-${index}`}
            data={data}
            refetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}

export function PartiesTable({ items }: { items: PartyType[] }) {
  const partyList = Array.isArray(items) ? items : [];
  return (
    <div className="w-full">
      <PartyTableHeader />
      <div>
        {partyList.map((data) => (
          <PartyTableTile key={data.id || data.short_name} data={data} />
        ))}
      </div>
    </div>
  );
}

export function MarketingTable({ items }: { items: MarketingCampaignType[] }) {
  const campaignsList = Array.isArray(items) ? items : [];
  return (
    <div className="w-full overflow-x-auto">
      <MarketingTableHeader />
      <div>
        {campaignsList.map((data, index) => (
          <MarketingTableTile key={data.id || index} data={data} />
        ))}
      </div>
    </div>
  );
}

export function INECResultGrabberTable({
  items,
}: {
  items: INECResultGrabberType[];
}) {
  const grabberList = Array.isArray(items) ? items : [];
  return (
    <div className="w-full">
      <INECGrabberTableHeader />
      <div>
        {grabberList.map((data, index) => (
          <INECGrabberTableTile key={data.id || index} data={data} />
        ))}
      </div>
    </div>
  );
}

export function INECResultGrabberLogsTable({
  items,
}: {
  items: INECResultGrabberLogType[];
}) {
  const logsList = Array.isArray(items) ? items : [];
  return (
    <div className="w-full">
      <INECGrabberLogTableHeader />
      <div>
        {logsList.map((data, index) => (
          <INECGrabberLogTableTile key={data.id || index} data={data} />
        ))}
      </div>
    </div>
  );
}

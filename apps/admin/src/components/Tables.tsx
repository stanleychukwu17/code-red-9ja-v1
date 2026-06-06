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
  ElectionTypeTableHeader,
  ElectionTypeTableTile,
  type ElectionTypeType,
} from "./tiles/election-type-tile";
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

export {
  type ElectionGroupType,
  type ElectionInstanceType,
  type ElectionTypeType,
  type StateType,
  type DistrictType,
  type FederalConstituencyType,
  type StateConstituencyType,
  type LgaType,
  type WardType,
  type PollingUnitType,
  type UserType,
  type PartyType,
};

export function ElectionGroupsTable({ items }: { items: ElectionGroupType[] }) {
  return (
    <div className="w-full">
      <ElectionGroupTableHeader />

      <div>
        {items.map((data, index) => (
          <ElectionGroupTableTile key={`${data.title}-${index}`} data={data} />
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
        {items.map((data, index) => (
          <ElectionInstanceTableTile
            key={`${data.title}-${index}`}
            data={data}
          />
        ))}
      </div>
    </div>
  );
}

export function ElectionTypesTable({ items }: { items: ElectionTypeType[] }) {
  return (
    <div className="w-full">
      <ElectionTypeTableHeader />

      <div>
        {items.map((data, index) => (
          <ElectionTypeTableTile key={`${data.title}-${index}`} data={data} />
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
          <StateTableTile key={data.title} data={data} />
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
          <DistrictTableTile key={`${data.title}-${index}`} data={data} />
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
          <FederalConstituencyTableTile key={data.title} data={data} />
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
          <StateConstituencyTableTile key={data.title} data={data} />
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
          <LgaTableTile key={data.title} data={data} />
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
          <WardTableTile key={data.title} data={data} />
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
          <PollingUnitTableTile key={data.title} data={data} />
        ))}
      </div>
    </div>
  );
}

export function UsersTable({ items }: { items: UserType[] }) {
  return (
    <div className="w-full">
      <UserTableHeader />
      <div>
        {items.map((data, index) => (
          <UserTableTile key={`${data.name}-${index}`} data={data} />
        ))}
      </div>
    </div>
  );
}

export function PartiesTable({ items }: { items: PartyType[] }) {
  return (
    <div className="w-full">
      <PartyTableHeader />
      <div>
        {items.map((data) => (
          <PartyTableTile key={data.code} data={data} />
        ))}
      </div>
    </div>
  );
}

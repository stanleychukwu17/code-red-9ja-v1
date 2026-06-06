import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";

export type UserType = {
  name: string;
  avatar: string;
  status: string;
  dateAdded: string;
};

export function UserTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="font-semibold text-c-80">User</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[140px] text-center hidden md:block">Status</span>
        <span className="text-c-50 text-[14px] w-[150px] text-center">Date added</span>
      </TileRight>
    </TileHeader>
  );
}

export function UserTableTile({ data }: { data: UserType }) {
  return (
    <TileRow>
      <TileLeft>
        <img
          src={data.avatar}
          alt={data.name}
          className="size-10 rounded-full object-cover shrink-0"
        />
        <p className="truncate w-full text-[16px] text-c-80 font-medium">
          {data.name}
        </p>
      </TileLeft>
      <TileRight>
        <div className="w-[140px] flex justify-center hidden md:block">
          <span className="rounded-full bg-[#e6e9ff] px-3 py-1 text-[13px] font-medium text-[#3846ff]">
            {data.status}
          </span>
        </div>
        <span className="text-[15px] text-c-70 w-[150px] text-center">{data.dateAdded}</span>
      </TileRight>
    </TileRow>
  );
}

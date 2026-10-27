export interface FollowingListProps {
  count: string;
}

export function FollowingList({ count }: FollowingListProps) {
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="font-bold text-c-100">
            Following ({count})
          </h3>
          <span className="text-xs text-c-40">
            Candidates & Political Org Leaders
          </span>
        </div>

        <div className="py-8 text-center text-sm text-c-50">
          Not following anyone yet.
        </div>
      </div>
    </div>
  );
}

export { FollowingList as FollowingTab };

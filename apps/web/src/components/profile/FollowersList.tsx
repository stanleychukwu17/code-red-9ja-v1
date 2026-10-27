export interface FollowersListProps {
  count: string;
}

export function FollowersList({ count }: FollowersListProps) {
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="font-bold text-c-100">
            Followers ({count})
          </h3>
          <span className="text-xs text-c-40">Verified Nigerian Voters</span>
        </div>

        <div className="py-8 text-center text-sm text-c-50">
          No followers to display yet.
        </div>
      </div>
    </div>
  );
}

export { FollowersList as FollowersTab };

import { Fragment } from "react";
import { ChevronRight, Home, Loader2 } from "lucide-react";

export type BreadcrumbItem = {
  id: number;
  name: string;
};

export type AssetBreadcrumbsProps = {
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
  isRefreshing?: boolean;
  folderCount: number;
  assetCount: number;
};

export function AssetBreadcrumbs({
  breadcrumbs,
  onBreadcrumbClick,
  isRefreshing = false,
  folderCount,
  assetCount,
}: AssetBreadcrumbsProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-sidebar-softer/40 px-4 py-3 border border-border/40">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const isRoot = idx === 0;

          return (
            <Fragment key={crumb.id}>
              {idx > 0 && <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />}
              <button
                type="button"
                onClick={() => onBreadcrumbClick(idx)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  isLast
                    ? "font-semibold text-c-100 bg-sidebar-softer"
                    : "text-muted-foreground hover:text-c-100 hover:bg-sidebar-softer/60"
                }`}
                aria-current={isLast ? "page" : undefined}
              >
                {isRoot && <Home className="size-3.5" />}
                <span>{crumb.name}</span>
              </button>
            </Fragment>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {isRefreshing && (
          <span className="flex items-center gap-1 text-primary">
            <Loader2 className="size-3 animate-spin" />
            Updating...
          </span>
        )}
        <span>
          {folderCount} {folderCount === 1 ? "folder" : "folders"}
        </span>
        <span>•</span>
        <span>
          {assetCount} {assetCount === 1 ? "asset" : "assets"}
        </span>
      </div>
    </div>
  );
}

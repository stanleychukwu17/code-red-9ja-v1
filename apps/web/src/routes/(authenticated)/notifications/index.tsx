import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppSidebarShell } from "../../../components/app-sidebar";
import {
  NOTIFICATIONS,
  type NotificationItem,
} from "../../../data/notifications";
import { cn } from "node_modules/@repo/ui/src/lib/utils";

export const Route = createFileRoute("/(authenticated)/notifications/")({
  component: RouteComponent,
});

type SeenMap = Record<string, number>;

const STORAGE_KEY = "free9ja.notifications.seenAt.v1";
const HIGHLIGHT_MS = 5000;

function RouteComponent() {
  const [highlightingIds, setHighlightingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const nextHighlighting = new Set<string>();
    const nextRead = new Set<string>();

    let seen: SeenMap = {};
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (parsed && typeof parsed === "object") {
          seen = parsed as SeenMap;
        }
      }
    } catch {
      // ignore storage errors
    }

    const now = Date.now();
    const updatedSeen: SeenMap = { ...seen };

    for (const notification of NOTIFICATIONS) {
      const shouldAutoRead = !!notification.unread;
      if (!shouldAutoRead) {
        continue;
      }

      const alreadySeenAt = updatedSeen[notification.id];
      if (alreadySeenAt) {
        nextRead.add(notification.id);
        continue;
      }

      nextHighlighting.add(notification.id);
      updatedSeen[notification.id] = now;

      const timer = window.setTimeout(() => {
        setHighlightingIds((prev) => {
          const next = new Set(prev);
          next.delete(notification.id);
          return next;
        });
        setReadIds((prev) => {
          const next = new Set(prev);
          next.add(notification.id);
          return next;
        });
        timersRef.current.delete(notification.id);
      }, HIGHLIGHT_MS);

      timersRef.current.set(notification.id, timer);
    }

    setHighlightingIds(nextHighlighting);
    setReadIds(nextRead);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSeen));
    } catch {
      // ignore storage errors
    }

    return () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const sections = useMemo(() => {
    const grouped: Record<NotificationItem["group"], NotificationItem[]> = {
      Today: [],
      Yesterday: [],
    };

    for (const item of NOTIFICATIONS) {
      grouped[item.group].push(item);
    }

    return grouped;
  }, []);

  return (
    <AppSidebarShell activeItem="notifications">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124]">
            Notifications
          </h1>

          <div className="space-y-7">
            {(["Today", "Yesterday"] as const).map((label) => {
              const items = sections[label];
              if (!items.length) return null;

              return (
                <section key={label} className="space-y-4">
                  <h2 className="px-1 text-[12px] font-bold text-[#1f1f1f]">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {items.map((item) => {
                      const isHighlighting = highlightingIds.has(item.id);
                      const isRead = readIds.has(item.id) || !item.unread;

                      return (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          isHighlighting={isHighlighting}
                          showUnreadDot={!isRead}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </AppSidebarShell>
  );
}

function NotificationRow({
  item,
  isHighlighting,
  showUnreadDot,
}: {
  item: NotificationItem;
  isHighlighting: boolean;
  showUnreadDot: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-[14px] px-4 py-4 transition-colors duration-700 ease-out",
        isHighlighting ? "bg-[#f7e3e8]" : "bg-transparent",
      )}
    >
      <img
        src={item.actorAvatar}
        alt={item.actorName}
        className="mt-0.5 size-11 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <p className="min-w-0 text-[14px] leading-6 text-[#3a3438]">
            <span className="font-semibold text-[#141214]">
              {item.actorName}
            </span>{" "}
            <span className="text-[#6f6a6e]">{item.text}</span>
          </p>
          <span className="shrink-0 text-[12px] text-[#a29da1]">
            {item.timestampLabel}
          </span>
        </div>
      </div>
      <div className="mt-2 flex w-5 justify-end">
        {showUnreadDot ? (
          <span className="inline-block size-2 rounded-full bg-[#e44b77]" />
        ) : null}
      </div>
    </div>
  );
}

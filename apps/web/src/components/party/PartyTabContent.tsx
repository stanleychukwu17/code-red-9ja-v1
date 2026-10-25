import { PartyLeadersCard } from "./PartyLeadersCard";
import type { PartyLeader, PartyTabId } from "./types";

interface PartyTabContentProps {
  activeTab: PartyTabId;
  col1Leaders: PartyLeader[];
  col2Leaders: PartyLeader[];
  partyName: string;
}

export function PartyTabContent({
  activeTab,
  col1Leaders,
  col2Leaders,
  partyName,
}: PartyTabContentProps) {
  switch (activeTab) {
    case "home":
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-16">
          <PartyLeadersCard
            title="National leaders"
            leaders={col1Leaders}
          />
          <PartyLeadersCard
            title="National leaders"
            leaders={col2Leaders}
          />
        </div>
      );

    case "timeline":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            {partyName} Historical Timeline
          </h3>
          <p className="mt-1 text-sm">Key milestones and political transitions.</p>
        </div>
      );

    case "events":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Party Events & Meetings
          </h3>
          <p className="mt-1 text-sm">Scheduled conventions, rallies, and council meetings for {partyName}.</p>
        </div>
      );

    case "leadership":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Party Leadership
          </h3>
          <p className="mt-1 text-sm">National and executive leadership structure for {partyName}.</p>
        </div>
      );

    case "party-chapters":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Party Chapters
          </h3>
          <p className="mt-1 text-sm">Find and explore registered chapters for {partyName}.</p>
        </div>
      );

    case "groups":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Affiliated Groups & Wings
          </h3>
          <p className="mt-1 text-sm">Youth wings, women assemblies, and regional caucuses.</p>
        </div>
      );

    case "members":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Registered Members
          </h3>
          <p className="mt-1 text-sm">Official membership directory and verification statuses.</p>
        </div>
      );

    case "party-admins":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Party Admins
          </h3>
          <p className="mt-1 text-sm">Designated administrative officers and representatives of {partyName}.</p>
        </div>
      );

    case "notifications":
      return (
        <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Party Notifications
          </h3>
          <p className="mt-1 text-sm">Official announcements and notifications for {partyName}.</p>
        </div>
      );
  }
}

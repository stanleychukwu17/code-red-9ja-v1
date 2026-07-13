import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Tabs } from "../../../components/Tabs";
import { ContactCard } from "../home/components/ContactCard";

export const Route = createFileRoute("/_authenticated/contacts/")({
  component: ContactsPage,
  validateSearch: (search: Record<string, unknown>): { task?: string } => {
    return {
      task: search.task as string | undefined,
    };
  },
});

function ContactsPage() {
  const navigate = useNavigate();
  const { task } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"Supervisors" | "Call Agents" | "Recent">("Supervisors");

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-center p-4 relative">
          <button
            onClick={() => navigate({ to: ".." })}
            className="absolute left-4 p-1 active:bg-c-5 rounded-full transition-colors"
          >
            <ChevronLeft className="size-6 text-c-80" />
          </button>
          <h1 className="text-xl font-bold text-c-90">Contacts</h1>
        </div>

        <div className="px-4 pb-4">
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab as any}
            tabs={[
              { label: "Supervisors", value: "Supervisors" },
              { label: "Call Agents", value: "Call Agents" },
              { label: "Recent", value: "Recent" },
            ]}
          />
        </div>
      </div>

      <div className="px-4 pb-24">
        {task && (
          <div className="bg-[#D9F7E8] rounded-[12px] p-4 flex items-start gap-3 mb-6">
            <div className="size-4 rounded-full bg-[#B2D6C4] shrink-0 mt-1" />
            <p className="text-[#1A3325] text-[18px] font-bold leading-snug">
              {task}
            </p>
          </div>
        )}

        {activeTab === "Supervisors" && <SupervisorsTab />}
        {activeTab === "Call Agents" && <CallAgentsTab />}
        {activeTab === "Recent" && <RecentTab />}
      </div>
    </div>
  );
}

function SupervisorsTab() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-[#333333] font-bold text-[18px] mb-3">
          Ward Election Supervisors
        </h2>
        <div className="flex flex-col">
          <ContactCard
            name="Aisha Mariam"
            role="Ward supervisor (USUAMA)"
            img="https://i.pravatar.cc/150?u=aisha"
            time="14:53"
          />
          <ContactCard
            name="Aisha Mariam"
            role="Ward supervisor (USUAMA)"
            img="https://i.pravatar.cc/150?u=aisha2"
            time="14:53"
          />
        </div>
      </section>

      <section>
        <h2 className="text-[#333333] font-bold text-[18px] mb-3">
          LGA Election Supervisors
        </h2>
        <div className="flex flex-col">
          <ContactCard
            name="Bitrus Samson"
            role="LGA supervisor (BWARI)"
            img="https://i.pravatar.cc/150?u=bitrus"
            time="14:53"
          />
          <ContactCard
            name="Bitrus Samson"
            role="LGA supervisor (BWARI)"
            img="https://i.pravatar.cc/150?u=bitrus2"
            time="14:53"
          />
        </div>
      </section>

      <section>
        <h2 className="text-[#333333] font-bold text-[18px] mb-3">
          State Election Supervisors
        </h2>
        <div className="flex flex-col">
          <ContactCard
            name="David Dredlone"
            role="State supervisor (BWARI)"
            img="https://i.pravatar.cc/150?u=david"
            time="14:53"
          />
        </div>
      </section>
    </div>
  );
}

function CallAgentsTab() {
  return (
    <div className="flex flex-col">
      <ContactCard
        name="Aisha Mariam"
        role="Not at polling unit"
        roleClassName="text-[#E53935]"
        img="https://i.pravatar.cc/150?u=aisha"
        time="14:53"
      />
      <ContactCard
        name="Aisha Mariam"
        role="Haven't uploaded polling unit result"
        roleClassName="text-[#8D6E63]"
        img="https://i.pravatar.cc/150?u=aisha3"
        time="14:53"
      />
      <ContactCard
        name="Aisha Mariam"
        role="Haven't given update in over 1 hour"
        roleClassName="text-[#FBC02D]"
        img="https://i.pravatar.cc/150?u=aisha4"
        time="14:53"
      />
    </div>
  );
}

function RecentTab() {
  return (
    <div className="flex flex-col">
      <ContactCard
        name="Aisha Mariam"
        role="Polling agent"
        img="https://i.pravatar.cc/150?u=aisha"
        time="14:53"
      />
      <ContactCard
        name="Jennifer Olakunle"
        role="Ward supervisor"
        img="https://i.pravatar.cc/150?u=jennifer"
        time="14:53"
      />
      <ContactCard
        name="Aisha Mariam"
        role="Polling agent"
        img="https://i.pravatar.cc/150?u=aisha2"
        time="14:53"
      />
    </div>
  );
}

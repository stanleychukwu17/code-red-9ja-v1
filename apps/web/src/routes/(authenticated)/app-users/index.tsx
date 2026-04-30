import { createFileRoute } from "@tanstack/react-router";
import { Globe2 } from "lucide-react";
import { useState } from "react";
import { AppPageHeader } from "../../../components/app-page-header";
import { AppSidebarShell } from "../../../components/app-sidebar";
import {
  APP_USERS_DIASPORA_ROWS,
  APP_USERS_HOME_ROWS,
  APP_USERS_SUMMARY,
} from "../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/app-users/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [activeTab, setActiveTab] = useState<"home" | "diaspora">("home");
  const rows =
    activeTab === "home" ? APP_USERS_HOME_ROWS : APP_USERS_DIASPORA_ROWS;

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
          <AppPageHeader title="App Users" />

          <section className="grid gap-5 xl:grid-cols-3">
            {APP_USERS_SUMMARY.map((item) => (
              <article
                key={item.label}
                className="rounded-[26px] bg-white px-7 py-6 shadow-[0_1px_0_rgba(28,28,28,0.03)] ring-1 ring-[#f0ebee]"
              >
                <p className="text-[18px] text-[#1d1b1e]">{item.label}</p>
                <div className="mt-8 flex items-end gap-3">
                  <span
                    className={`text-[58px] font-bold leading-none tracking-[-0.05em] ${
                      item.accent ? "text-[#2f6f57]" : "text-[#3a3a3a]"
                    }`}
                  >
                    {item.value}
                  </span>
                  <span className="pb-2 text-[18px] text-[#7d9287]">
                    million
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="space-y-6">
            <div className="flex w-full max-w-[430px] rounded-[18px] bg-[#ece8ec] p-1">
              <TabButton
                active={activeTab === "home"}
                label="Home"
                value="4.3m"
                onClick={() => setActiveTab("home")}
              />
              <TabButton
                active={activeTab === "diaspora"}
                label="Diaspora"
                value="4.3m"
                onClick={() => setActiveTab("diaspora")}
              />
            </div>

            <div className="rounded-[26px] bg-white px-5 py-3 shadow-[0_1px_0_rgba(28,28,28,0.03)] ring-1 ring-[#f0ebee]">
              {rows.map((row) => (
                <div
                  key={typeof row === "string" ? row : row.name}
                  className="flex items-center justify-between gap-4 px-3 py-6"
                >
                  <div className="flex items-center gap-4">
                    {typeof row === "string" ? null : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#eef2ff] text-[12px] font-bold text-[#4053b5]">
                        {row.flag}
                      </div>
                    )}
                    <span className="text-[18px] text-[#232124]">
                      {typeof row === "string" ? row : row.name}
                    </span>
                  </div>
                  <span className="text-[18px] font-bold text-[#232124]">
                    4,308
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3 text-[#242123]">
            <Globe2 className="size-5 text-[#1eba68]" />
            <span className="text-[16px] font-medium">Online users</span>
          </div>
        </div>
      </div>
    </AppSidebarShell>
  );
}

function TabButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-between rounded-[14px] px-4 py-4 text-[16px] transition ${
        active ? "bg-[#0d7431] text-white" : "bg-transparent text-[#1f1d20]"
      }`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </button>
  );
}

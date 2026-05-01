import { createFileRoute } from "@tanstack/react-router";
import { AppPageHeader } from "../../../components/app-page-header";
import { AppSidebarShell } from "../../../components/app-sidebar";
import { CANDIDATES } from "../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/candidates/")({
  component: RouteComponent,
});

function RouteComponent() {
  const leader = CANDIDATES[0];

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
          <AppPageHeader
            title="Candidates"
            subtitle="2026"
            right={
              <div className="relative hidden md:block">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="size-[92px] rounded-full object-cover"
                />
                <div className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full bg-[#d5e2da] text-[16px] font-bold text-black">
                  #1
                </div>
              </div>
            }
          />

          <div className="space-y-4">
            <h2 className="text-[56px] font-bold leading-none tracking-[-0.05em] text-[#2f6f57]">
              Presidential Election
            </h2>

            <div className="flex items-center justify-between rounded-[16px] bg-[#e5ecfd] px-5 py-5">
              <span className="text-[18px] font-semibold text-[#1b1a1b]">
                5.5m total votes
              </span>
              <span className="text-[18px] font-semibold text-[#5191ff]">
                4 hours, 33 min left
              </span>
            </div>
          </div>

          <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_1px_0_rgba(28,28,28,0.03)] ring-1 ring-[#f0ebee]">
            {CANDIDATES.map((candidate) => (
              <div
                key={candidate.name}
                className="grid grid-cols-[minmax(0,1fr)_110px_130px_52px] items-center gap-4 py-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={candidate.image}
                    alt={candidate.name}
                    className="size-11 rounded-full object-cover"
                  />
                  <span className="text-[18px] text-[#1e1c1f]">
                    {candidate.name}
                  </span>
                </div>
                <span className="text-right text-[16px] font-semibold text-[#444444]">
                  {candidate.states}
                </span>
                <span className="text-right text-[16px] font-semibold text-[#444444]">
                  {candidate.votes}
                </span>
                <span className="text-right text-[16px] font-semibold text-[#888888]">
                  {candidate.rank}
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

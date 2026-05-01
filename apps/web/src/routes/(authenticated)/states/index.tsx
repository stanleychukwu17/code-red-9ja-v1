import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppPageHeader } from "../../../components/app-page-header";
import { AppSidebarShell } from "../../../components/app-sidebar";
import { STATES_PAGE_ROWS } from "../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/states/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <AppSidebarShell activeItem="home">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
          <AppPageHeader title="States" />

          <section className="rounded-[26px] bg-white px-5 py-4 shadow-[0_1px_0_rgba(28,28,28,0.03)] ring-1 ring-[#f0ebee]">
            {STATES_PAGE_ROWS.map((state) => (
              <button
                key={state.name}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/states/$stateId",
                    params: { stateId: state.name },
                  })
                }
                className="grid w-full grid-cols-[minmax(0,1fr)_auto_120px_52px] items-center gap-4 py-4 text-left"
              >
                <span className="text-[18px] text-[#1e1c1f]">{state.name}</span>
                <img
                  src={state.image}
                  alt={state.name}
                  className="size-9 rounded-full object-cover"
                />
                <span className="text-right text-[16px] font-semibold text-[#111111]">
                  2.8m votes
                </span>
                <span className="text-right text-[16px] font-semibold text-[#8c8c8c]">
                  #1
                </span>
              </button>
            ))}
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

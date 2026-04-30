import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppSidebarShell } from "../../../components/app-sidebar";
import {
  SEARCH_PEOPLE_RESULTS,
  SEARCH_POLLING_UNIT_RESULTS,
  SEARCH_STATE_RESULTS,
} from "../../../data/dashboard";

type SearchTab = "People" | "Polling Unit" | "State";

export const Route = createFileRoute("/(authenticated)/search/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("People");
  const navigate = useNavigate();

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source =
      activeTab === "People"
        ? SEARCH_PEOPLE_RESULTS
        : activeTab === "Polling Unit"
          ? SEARCH_POLLING_UNIT_RESULTS
          : SEARCH_STATE_RESULTS;

    if (!normalizedQuery) return source;

    return source.filter((item) =>
      [item.name, item.subtitle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [activeTab, query]);

  return (
    <AppSidebarShell activeItem="search">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124]">
            Search
          </h1>

          <div className="flex h-[62px] items-center gap-4 rounded-full bg-[#ece8ec] px-5">
            <SearchIcon className="size-6 text-[#8e898b]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[18px] text-[#242123] outline-none placeholder:text-[#a3a0a4]"
            />
          </div>

          <div className="flex items-center gap-3">
            {(["People", "Polling Unit", "State"] as const).map((tab) => {
              const active = tab === activeTab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-5 py-3 text-[16px] font-bold transition ${
                    active
                      ? "bg-[#e4efe7] text-[#2f7351]"
                      : "bg-transparent text-[#a4a0a2]"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <section>
            {results.map((result) =>
              result.type === "People" ? (
                <button
                  key={result.name}
                  type="button"
                  className="flex h-16 w-full items-center gap-4 text-left"
                >
                  <img
                    src={result.image}
                    alt={result.name}
                    className="size-11 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-[16px] font-medium text-[#161315]">
                      {result.name}
                    </p>
                    <p className="text-[12px] text-[#8b8589]">
                      {result.subtitle}
                    </p>
                  </div>
                </button>
              ) : result.type === "Polling Unit" ? (
                <button
                  key={result.name}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/polling-unit/$pollingUnitId",
                      params: { pollingUnitId: result.name },
                    })
                  }
                  className="grid h-16 w-full grid-cols-[minmax(0,1fr)_80px_48px] items-center gap-4 text-left"
                >
                  <div>
                    <p className="text-[16px] text-black/80">{result.name}</p>
                    <p className="text-[12px] text-[#8b8589]">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-right text-[16px] font-bold text-black/80">
                    {result.votes}
                  </span>
                  <span className="text-right text-[16px] font-bold text-black/40">
                    #4
                  </span>
                </button>
              ) : (
                <button
                  key={result.name}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/states/$stateId",
                      params: { stateId: result.name },
                    })
                  }
                  className="grid h-16 w-full grid-cols-[minmax(0,1fr)_120px_48px] items-center gap-4 text-left"
                >
                  <div>
                    <p className="text-[16px] text-black/80">{result.name}</p>
                    <p className="text-[12px] text-[#8b8589]">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-right text-[16px] font-bold text-black/80">
                    {result.votes}
                  </span>
                  <span className="text-right text-[16px] font-bold text-black/40">
                    {result.rank}
                  </span>
                </button>
              ),
            )}
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

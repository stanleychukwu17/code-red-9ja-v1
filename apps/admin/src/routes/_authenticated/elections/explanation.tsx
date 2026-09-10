import { createFileRoute, Link } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { ELECTION_TABS } from "./-data";
import { APP_URL } from "#/lib/config";
import {
  Briefcase,
  Layers,
  Vote,
  ArrowRight,
  Workflow,
  Calendar,
  MapPin,
  CheckCircle2,
  Info,
  Sparkles,
  HelpCircle,
  Clock,
  ChevronRight,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/elections/explanation")({
  head: () => getPageHeader({ title: "Elections - Explanation & Guide" }),
  component: ExplanationRouteComponent,
});

function ExplanationRouteComponent() {
  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="explanation"
        tabs={ELECTION_TABS}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Hero / Introduction Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-c-10 via-background to-c-10/40 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Elections System Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-c-90">
                Understanding the Election Management Framework
              </h1>
              <p className="text-c-70 text-sm sm:text-base leading-relaxed">
                The Free9ja election platform organizes electoral administration into three distinct,
                interconnected pillars: <strong>Offices</strong>, <strong>Groups</strong>, and{" "}
                <strong>Instances</strong>. Together, they power candidate registrations, party assignments,
                agent deployments, and real-time result tabulation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <Link
                to={APP_URL.elections.groups}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
              >
                <Layers className="w-4 h-4" />
                <span>Go to Groups</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
              <Link
                to={APP_URL.elections.instances}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-c-10 text-c-90 text-sm font-medium transition-colors"
              >
                <Vote className="w-4 h-4" />
                <span>Go to Instances</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
              <Link
                to={APP_URL.elections.offices}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-c-10 text-c-90 text-sm font-medium transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                <span>Go to Offices</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </div>
          </div>
        </section>

        {/* Conceptual Relationship / Mental Model */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-c-90">
              How The 3 Entities Relate
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch relative">
            {/* Offices Pillar */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 relative">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-c-50">
                  Step 1: The "What"
                </div>
                <h3 className="text-lg font-bold text-c-90">Offices</h3>
                <p className="text-xs sm:text-sm text-c-70 leading-relaxed">
                  Defines the political position or seat being contested (e.g. <em>President</em>, <em>Governor</em>, <em>Senator</em>).
                </p>
              </div>
              <div className="pt-3 border-t border-border/60 text-xs text-c-50">
                Independent &amp; reusable across all election cycles.
              </div>
            </div>

            {/* Groups Pillar */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 relative">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-c-50">
                  Step 2: The "When"
                </div>
                <h3 className="text-lg font-bold text-c-90">Groups</h3>
                <p className="text-xs sm:text-sm text-c-70 leading-relaxed">
                  Coordinates an electoral cycle or calendar event holding on a specific date (e.g. <em>2027 General Elections</em>).
                </p>
              </div>
              <div className="pt-3 border-t border-border/60 text-xs text-c-50">
                Owns the master date &amp; cascades updates to child instances.
              </div>
            </div>

            {/* Instances Pillar */}
            <div className="rounded-xl border border-primary/40 bg-card p-5 flex flex-col justify-between space-y-4 relative shadow-xs ring-1 ring-primary/20">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Vote className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-primary font-medium">
                  Step 3: The "Where &amp; Who"
                </div>
                <h3 className="text-lg font-bold text-c-90">Instances</h3>
                <p className="text-xs sm:text-sm text-c-70 leading-relaxed">
                  The actual contested ballot event combining an <strong>Office</strong> + <strong>Group</strong> + <strong>Geographical Jurisdiction</strong>.
                </p>
              </div>
              <div className="pt-3 border-t border-border/60 text-xs text-c-50">
                Where candidates, votes, polling units &amp; agents attach.
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Breakdown for each tab */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-c-90">
              In-Depth Breakdown of Each Tab
            </h2>
          </div>

          <div className="space-y-6">
            {/* 1. GROUPS */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-c-90">
                      1. Election Groups (/elections)
                    </h3>
                    <p className="text-xs text-c-50">
                      Master cycle umbrella &amp; master calendar date
                    </p>
                  </div>
                </div>
                <Link
                  to={APP_URL.elections.groups}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Open Groups Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-c-90 text-xs uppercase tracking-wide">
                    What are Election Groups?
                  </h4>
                  <p className="text-c-70 leading-relaxed text-xs sm:text-sm">
                    An Election Group represents an umbrella event or election timetable cycle. For example, during general elections, Nigeria holds Presidential and National Assembly elections on one date, and Governorship and State Assembly elections on another. Each timetable date is represented by an Election Group.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-c-90 text-xs uppercase tracking-wide">
                    Key Features &amp; Rules
                  </h4>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-c-70">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Date Cascading:</strong> When you update an Election Group's date, all elections under that group automatically receive the updated election date.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Ranking:</strong> The rank determines display priority in dropdowns, public portals, and overview lists.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Statistics:</strong> Displays aggregated counts of associated elections and impacted states.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. INSTANCES */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Vote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-c-90">
                      2. Election Instances (/elections/instances)
                    </h3>
                    <p className="text-xs text-c-50">
                      The concrete ballot contests per geopolitical jurisdiction
                    </p>
                  </div>
                </div>
                <Link
                  to={APP_URL.elections.instances}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Open Instances Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 text-sm">
                <p className="text-c-70 leading-relaxed text-xs sm:text-sm">
                  Election Instances are the specific contests that citizens vote in. Each instance is bound to an Election Group and an Office, and is partitioned by Nigeria's geopolitical hierarchy.
                </p>

                <h4 className="font-semibold text-c-90 text-xs uppercase tracking-wide pt-2">
                  Supported Geopolitical Scopes:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Nationwide Election</span>
                    </div>
                    <p className="text-xs text-c-50">
                      Contested across all 36 States &amp; FCT (e.g. Presidential Election).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>State Election</span>
                    </div>
                    <p className="text-xs text-c-50">
                      Contested statewide within a single state (e.g. Governorship).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Senatorial District</span>
                    </div>
                    <p className="text-xs text-c-50">
                      Scoped to one of the 109 Senatorial Districts in Nigeria.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Federal Constituency</span>
                    </div>
                    <p className="text-xs text-c-50">
                      House of Representatives constituencies spanning specific LGAs.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>State Constituency</span>
                    </div>
                    <p className="text-xs text-c-50">
                      State House of Assembly constituencies within states.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-c-10 border border-border space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-c-90 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>LGA &amp; Ward Elections</span>
                    </div>
                    <p className="text-xs text-c-50">
                      Local council elections for LGA Chairmen and Ward Councilors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. OFFICES */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-c-90">
                      3. Offices (/elections/offices)
                    </h3>
                    <p className="text-xs text-c-50">
                      The catalog of elected political positions and titles
                    </p>
                  </div>
                </div>
                <Link
                  to={APP_URL.elections.offices}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Open Offices Tab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold text-c-90 text-xs uppercase tracking-wide">
                    What is an Office?
                  </h4>
                  <p className="text-c-70 leading-relaxed text-xs sm:text-sm">
                    An Office defines the constitutionally mandated or elected position that candidates seek to occupy. Examples include <em>President</em>, <em>Governor</em>, <em>Senator</em>, <em>House of Representatives Member</em>, and <em>Chairman</em>.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-c-90 text-xs uppercase tracking-wide">
                    Why are Offices separated?
                  </h4>
                  <p className="text-c-70 leading-relaxed text-xs sm:text-sm">
                    Decoupling the Office from the election instance allows standardizing titles, responsibilities, and hierarchy across repeated election cycles. You create the "Governor" office once, and it is referenced by every gubernatorial election across all 36 states and all election years.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Practical Workflow */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-c-90">
              Recommended Administrative Workflow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-c-10 border border-border/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h3 className="font-bold text-sm text-c-90">Create Offices</h3>
              <p className="text-xs text-c-70 leading-relaxed">
                Go to <strong>Offices</strong> and ensure the target seat exists (e.g. Senator, Governor). If missing, click <strong>Add Office</strong>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-c-10 border border-border/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h3 className="font-bold text-sm text-c-90">Create Group</h3>
              <p className="text-xs text-c-70 leading-relaxed">
                Go to <strong>Groups</strong> and click <strong>Add</strong>. Set the group name and official election voting date.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-c-10 border border-border/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h3 className="font-bold text-sm text-c-90">Create Instance</h3>
              <p className="text-xs text-c-70 leading-relaxed">
                Go to <strong>Instances</strong> and click <strong>Add</strong>. Select the scope (e.g. State, Senatorial) and link it to the Group and Office.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-c-10 border border-border/80 space-y-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                4
              </div>
              <h3 className="font-bold text-sm text-c-90">Assign &amp; Monitor</h3>
              <p className="text-xs text-c-70 leading-relaxed">
                Candidate profiles, party allocations, polling agent monitoring, and INEC result collations will bind to this instance.
              </p>
            </div>
          </div>
        </section>

        {/* Pro Tips / Best Practices Banner */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm text-c-70">
            <h4 className="font-semibold text-c-90">Pro-Tip on Date Adjustments:</h4>
            <p>
              If INEC shifts an election date, simply edit the parent <strong>Election Group</strong> in the Groups tab.
              The system will automatically update the election date across all attached election instances, saving you from updating dozens or hundreds of contests manually.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}

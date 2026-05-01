import LogoIcon from "@repo/ui/icons/logo-icon";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function OnboardingWrapper({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-dvh bg-background px-4 pb-6 pt-4 md:px-8 md:pb-10 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92)_0%,rgba(251,246,250,0)_72%)] md:block" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1320px] flex-col md:min-h-[calc(100dvh-4.5rem)]">
        <div className="flex items-center gap-3 text-primary">
          <LogoIcon className="size-8 shrink-0" />
          <span className="text-[24px] font-semibold">Free9ja.</span>
        </div>

        <section className="mx-auto flex w-full max-w-[430px] flex-1 flex-col pt-5">
          {children}
        </section>
      </div>
    </main>
  );
}

export function OnboardingHeader({
  title,
  subtitle,
  icon,
  onBack,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onBack: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex h-11 w-11 items-center justify-center rounded-full text-c-80 transition-colors hover:bg-black/5 md:hidden"
        aria-label="Go back"
      >
        <ChevronLeft className="size-5" />
      </button>

      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-[#f4ecef]">
        {icon}
      </div>

      <div className="mb-8 space-y-2">
        <h1 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-primary">
          {title}
        </h1>
        <p className="max-w-[22rem] text-base leading-6 text-c-50">
          {subtitle}
        </p>
      </div>
    </>
  );
}

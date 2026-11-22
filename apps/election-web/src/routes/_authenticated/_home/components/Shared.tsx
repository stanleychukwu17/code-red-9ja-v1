import { TitleText } from "@repo/ui/components/custom/Texts";

export const GreyCardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="bg-sidebar-softer/60 rounded-[20px] my-5 px-6 py-6 flex flex-col gap-2">
      {children}
    </section>
  );
};

export const GreyCardTopRow = ({
  title,
  subtitle,
  icon,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between text-c-50">
      <div className="flex items-center gap-2">
        <div className="min-w-5">{icon}</div>
        <span className="truncate max-w-[200px]">{title}</span>
      </div>
      <span className="text-c-90 font-bold">{subtitle}</span>
    </div>
  );
};

export const GreyCardTitle = ({ label }: { label: string }) => {
  return <TitleText text={label} size="lg" />;
};

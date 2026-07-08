import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";

export const GreyCardWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <section className="bg-c-5 rounded-[20px] px-4 py-4 flex flex-col gap-2">
      {children}
    </section>
  );
};

export const GreyCardTopRow = ({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) => {
  return (
    <div className="flex items-center justify-between font-medium text-c-50 text-sm">
      <div className="flex items-center gap-2">
        <PollingUnitIcon className="size-7" />
        <span className="truncate max-w-[200px]">{title}</span>
      </div>
      <span>{subtitle}</span>
    </div>
  );
};

export const GreyCardTitle = ({ label }: { label: string }) => {
  return (
    <h2 className="text-[#0F4C3A] font-bold text-[28px] leading-tight tracking-tight mt-1">
      {label}
    </h2>
  );
};

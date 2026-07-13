import { TitleText } from "@repo/ui/components/custom/Texts";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";

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

export const PayoutCardWrapper = ({
  amount,
  children,
}: {
  amount: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-c-5 rounded-[20px] p-4 flex flex-col gap-3 border border-c-10/50">
      <div className="flex items-center justify-between text-c-50 text-[13px] font-medium">
        <div className="flex items-center gap-1.5">
          <FancyMoneyBagIcon className="size-5" />
          <span>Potential Payout</span>
        </div>
        <span className="text-black font-extrabold text-[15px]">{amount}</span>
      </div>
      {children}
    </div>
  );
};

export function HomeBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[440px] flex flex-col gap-6 px-4 mt-5 mb-40">
      {children}
    </div>
  );
}

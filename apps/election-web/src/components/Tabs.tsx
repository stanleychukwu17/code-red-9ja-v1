export type TabItem = {
  label: string;
  value: string;
};

export type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
};

type TabProps = TabItem & {
  activeTab: string;
  onTabChange: (value: string) => void;
};

const Tab = ({ label, value, activeTab, onTabChange }: TabProps) => (
  <button
    onClick={() => onTabChange(value)}
    className={`flex-1 py-2.5 rounded-10 text-c-80 font-medium text-center text-[15px] transition cursor-pointer ${activeTab === value ? "bg-primary text-white shadow-sm" : "hover:text-neutral-800"}`}
  >
    {label}
  </button>
);

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      className={`bg-c-5 p-1 rounded-12 flex items-center justify-between ${className || ""}`}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          label={tab.label}
          value={tab.value}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      ))}
    </div>
  );
}

type HomeTabsProps = {
  activeTab: "Earnings" | "Uploads";
  onTabChange: (tab: "Earnings" | "Uploads") => void;
};

export function HomeTabs({ activeTab, onTabChange }: HomeTabsProps) {
  return (
    <Tabs
      className="mt-4"
      activeTab={activeTab}
      onTabChange={onTabChange as any}
      tabs={[
        { label: "Earnings", value: "Earnings" },
        { label: "Uploads", value: "Uploads" },
      ]}
    />
  );
}

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

const Tab = ({
  label,
  value,
  activeTab,
  onTabChange,
}: {
  label: string;
  value: string;
  activeTab: string;
  onTabChange: (value: string) => void;
}) => (
  <button
    onClick={() => onTabChange(value)}
    className={`flex-1 py-2.5 rounded-[10px] text-c-80 font-medium text-center transition cursor-pointer ${activeTab === value ? "bg-primary text-white shadow-sm" : "hover:text-neutral-800"}`}
  >
    {label}
  </button>
);

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div
      className={`bg-c-5 p-1 rounded-[12px] flex items-center justify-between ${className || ""}`}
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

interface HomeTabsProps {
  activeTab: "Objectives" | "Contact Party" | "Uploads";
  onTabChange: (tab: "Objectives" | "Contact Party" | "Uploads") => void;
}

export function HomeTabs({ activeTab, onTabChange }: HomeTabsProps) {
  return (
    <Tabs
      className="mt-4"
      activeTab={activeTab}
      onTabChange={onTabChange as any}
      tabs={[
        { label: "Objectives", value: "Objectives" },
        { label: "Contact Party", value: "Contact Party" },
        { label: "Uploads", value: "Uploads" },
      ]}
    />
  );
}

export function SupervisorMetricsCard() {
  const metrics = [
    { label: "Agents that are at their PU", value: "982", total: "4,321" },
    { label: "Manned Polling Units", value: "728", total: "1,284" },
    { label: "Avg. Agent arrival time", value: "9:13", total: "7:00" },
    { label: "PU election have started in", value: "728", total: "1,284" },
    { label: "Agent Updates", value: "324", total: "6,968" },
    { label: "Agent Reports", value: "51", total: "2,000" },
    { label: "Results uploaded", value: "0", total: "1,284" },
  ];

  return (
    <div className="w-full bg-[#111111] rounded-3xl p-6 flex flex-col gap-5 text-white shadow-lg">
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#404040]" />
            <span className="text-[15px] font-medium text-gray-200">
              {metric.label}
            </span>
          </div>
          <div className="text-[15px]">
            <span className="font-bold text-white">{metric.value}</span>
            <span className="text-gray-400 font-medium"> / {metric.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

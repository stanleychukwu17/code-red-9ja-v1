import { InfoCard } from "@repo/ui/components/cards/Rewards";
import { TitleText } from "@repo/ui/components/custom/Texts";
import AlertIcon from "@repo/ui/icons/alert-icon";
import CloudIcon from "@repo/ui/icons/cloud-icon";

export function UploadsTab() {
  return (
    <div className="flex flex-col gap-4">
      <InfoCard
        label="Waiting for network..."
        className="font-medium text-[#AA8C30] text-center"
        icon={<AlertIcon />}
      />

      <div className="flex items-center justify-between">
        <TitleText text="Uploaded updates" size="md" />
        <span className="text-c-80 font-bold text-[20px]">4/8</span>
      </div>

      <div className="flex flex-col mt-2 gap-5">
        {[
          {
            type: "uploading",
            label: "Uploading voting result...",
            time: "10:42 AM",
            img: "https://i.pravatar.cc/150?img=65",
          },
          {
            type: "error",
            label: "Uploading PU update...",
            time: "10:42 AM",
            img: "https://i.pravatar.cc/150?img=3",
          },
        ].map((upload, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={upload.img}
                alt="Upload thumbnail"
                className="size-10 rounded-xl object-cover shadow-sm"
              />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {upload.type === "error" ? (
                    <AlertIcon
                      className="w-[18px] h-[18px] text-[#E53935]"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <CloudIcon
                      className="w-[18px] h-[18px] text-neutral-400 fill-neutral-400"
                      strokeWidth={0}
                    />
                  )}
                  <span
                    className={`${upload.type === "error" ? "text-[#E53935]" : "text-neutral-500"}`}
                  >
                    {upload.label}
                  </span>
                </div>
                <span className="text-c-40 text-sm">{upload.time}</span>
              </div>
            </div>
            <button className="text-c-40 hover:text-c-50 transition">
              Retry
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

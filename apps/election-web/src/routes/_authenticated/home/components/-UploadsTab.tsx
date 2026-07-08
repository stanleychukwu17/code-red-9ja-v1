import { Cloud, TriangleAlert } from "lucide-react";

export function UploadsTab() {
  return (
    <div className="flex flex-col gap-4 mt-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-[#0F4C3A] font-extrabold text-[22px]">Uploaded updates</h2>
        <span className="text-[#0F4C3A] font-extrabold text-[22px]">4/8</span>
      </div>
      
      <div className="bg-[#FDF2D4] rounded-[12px] p-4 text-center mt-1 shadow-sm">
        <span className="text-[#333333] font-bold text-[16px]">Waiting for network...</span>
      </div>

      <div className="flex flex-col mt-2 gap-5">
        {[
          { type: "uploading", label: "Uploading voting result...", time: "10:42 AM", img: "https://i.pravatar.cc/150?img=65" },
          { type: "uploading", label: "Uploading PU update...", time: "10:42 AM", img: "https://i.pravatar.cc/150?img=3" },
          { type: "uploading", label: "Uploading PU update...", time: "10:42 AM", img: "https://i.pravatar.cc/150?img=3" },
          { type: "error", label: "Couldn't upload", time: "7:31 AM", img: "https://i.pravatar.cc/150?img=3" },
          { type: "uploading", label: "Uploading PU update...", time: "10:42 AM", img: "https://i.pravatar.cc/150?img=3" },
        ].map((upload, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={upload.img} alt="Upload thumbnail" className="w-[52px] h-[52px] rounded-[16px] object-cover border border-neutral-200 shadow-sm" />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {upload.type === "error" ? (
                    <TriangleAlert className="w-[18px] h-[18px] text-[#E53935]" strokeWidth={2.5} />
                  ) : (
                    <Cloud className="w-[18px] h-[18px] text-neutral-400 fill-neutral-400" strokeWidth={0} />
                  )}
                  <span className={`text-[16px] font-bold tracking-tight ${upload.type === "error" ? "text-[#E53935]" : "text-neutral-500"}`}>
                    {upload.label}
                  </span>
                </div>
                <span className="text-neutral-400 text-[13px] font-semibold">{upload.time}</span>
              </div>
            </div>
            <button className="text-neutral-400 font-semibold text-[15.5px] hover:text-neutral-600 transition">
              Retry
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

export type SearchableOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((o) => o.label.toLowerCase().includes(normalized))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-c-20 bg-white px-3 py-2 text-left text-[14px] text-c-100 disabled:bg-c-5 disabled:text-c-50"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-[11px] text-c-50 shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-c-20 bg-white shadow-lg">
          <div className="p-2 border-b border-c-15">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-c-20 px-2.5 py-1.5 text-[13px] text-c-100"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-c-5 ${
                value === "" ? "font-semibold text-c-100" : "text-c-60"
              }`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-c-50">
                No matches found
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-c-5 ${
                    opt.value === value
                      ? "bg-c-5 font-semibold text-c-100"
                      : "text-c-80"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

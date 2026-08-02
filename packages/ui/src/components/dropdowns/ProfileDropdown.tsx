import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "../../hooks/use-theme";
import { DropdownMenuItem } from "../dropdown-menu";
import SettingsIcon from "../../icons/navbar/settings-icon";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";
import SunIcon from "../../icons/sun-icon";
import MoonIcon from "../../icons/moon-icon";
import SystemIcon from "../../icons/system-icon";

export function ProfileDropdown({
  onLogout,
  homePageUrl,
}: {
  onLogout?: () => void | Promise<void>;
  homePageUrl?: string;
}) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    if (homePageUrl) {
      navigate({ to: homePageUrl as never });
    }
  };

  return (
    <div className="flex flex-col gap-0.5 w-full outline-none">
      <DropdownMenuItem
        onClick={() => navigate({ to: "/settings" as never })}
        className="gap-3 cursor-pointer h-14 font-medium px-3 text-base rounded-2xl dark:focus:bg-white/10"
      >
        <SettingsIcon className="size-6 text-foreground" />
        <span>Settings</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={handleLogout}
        className="gap-3 cursor-pointer h-14 font-medium px-3 text-base text-red focus:bg-red/10 dark:focus:bg-red/20 rounded-2xl"
      >
        <LogOut className="size-6 text-red-500" />
        <span>Logout</span>
      </DropdownMenuItem>

      <div className="flex items-center justify-between px-3 py-2 mt-2 gap-4">
        <span className="text-[15px] font-medium text-foreground">Theme</span>
        <div className="flex items-center gap-1 bg-muted dark:bg-white/10 p-1 rounded-[12px] w-full max-w-[140px]">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 flex justify-center items-center size-10 rounded-[10px] transition-all cursor-pointer",
              theme === "light"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Light Mode"
          >
            <SunIcon className="size-6" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 flex justify-center items-center size-10 rounded-[10px] transition-all cursor-pointer",
              theme === "dark"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Dark Mode"
          >
            <MoonIcon className="size-6" />
          </button>
          <button
            onClick={() => setTheme("auto")}
            className={cn(
              "flex-1 flex justify-center items-center size-10 rounded-[10px] transition-all cursor-pointer",
              theme === "auto"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="System Mode"
          >
            <SystemIcon className="size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

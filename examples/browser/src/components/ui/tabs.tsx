import { cn } from "../../lib/utils";

interface TabsProps {
  tabs: string[];
  active: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-zinc-800 pb-0", className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors cursor-pointer",
            active === tab
              ? "bg-zinc-800 text-zinc-100 border-b-2 border-blue-500"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

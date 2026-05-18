import { CalendarDays, Home, Settings, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type TabKey = "dashboard" | "chart" | "finances" | "residents" | "structure";

const TABS: { key: TabKey; label: string; path: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Главная", path: "", icon: Home },
  { key: "chart", label: "Календарь", path: "/chart", icon: CalendarDays },
  { key: "finances", label: "Финансы", path: "/finances", icon: Wallet },
  { key: "residents", label: "Жильцы", path: "/residents", icon: Users },
  { key: "structure", label: "Настройки", path: "/structure", icon: Settings },
];

export function PropertyTabs({
  propertyId,
  active,
}: {
  propertyId: string;
  active: TabKey;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const className =
          "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:px-4";
        return tab.key === active ? (
          <span
            key={tab.key}
            className={`${className} bg-foreground text-background`}
          >
            <Icon className="size-4" />
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={`/objects/${propertyId}${tab.path}`}
            className={`${className} text-muted-foreground hover:bg-muted border`}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

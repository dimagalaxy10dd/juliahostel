"use client";

import { CalendarDays, Home, Settings, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

const TABS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "Главная", path: "", icon: Home },
  { label: "Календарь", path: "/chart", icon: CalendarDays },
  { label: "Финансы", path: "/finances", icon: Wallet },
  { label: "Жильцы", path: "/residents", icon: Users },
  { label: "Настройки", path: "/structure", icon: Settings },
];

// Навигация по объекту. Активный объект и вкладка определяются из адреса,
// поэтому компонент можно разместить один раз в шапке. На страницах вне
// объекта (список объектов, вход) ничего не выводит.
export function PropertyTabs() {
  const pathname = usePathname();
  const match = pathname.match(/^\/objects\/([^/]+)(.*)$/);
  if (!match) return null;
  const propertyId = match[1];
  const rest = match[2];

  return (
    <nav className="mt-3 flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = rest === tab.path;
        const base =
          "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors";
        return active ? (
          <span
            key={tab.path}
            className={`${base} bg-foreground text-background`}
          >
            <Icon className="size-4" />
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.path}
            href={`/objects/${propertyId}${tab.path}`}
            className={`${base} text-muted-foreground hover:bg-muted`}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

import Link from "next/link";

type TabKey = "chart" | "residents" | "finances" | "structure";

const TABS: { key: TabKey; label: string; path: string }[] = [
  { key: "chart", label: "Шахматка", path: "" },
  { key: "residents", label: "Жильцы", path: "/residents" },
  { key: "finances", label: "Финансы", path: "/finances" },
  { key: "structure", label: "Структура", path: "/structure" },
];

export function PropertyTabs({
  propertyId,
  active,
}: {
  propertyId: string;
  active: TabKey;
}) {
  return (
    <nav className="flex gap-2">
      {TABS.map((tab) =>
        tab.key === active ? (
          <span
            key={tab.key}
            className="bg-foreground text-background rounded-full px-4 py-2 text-sm font-medium"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={`/objects/${propertyId}${tab.path}`}
            className="text-muted-foreground hover:bg-muted rounded-full border px-4 py-2 text-sm font-medium transition-colors"
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

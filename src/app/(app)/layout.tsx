import { auth } from "@/auth";
import { AutoRefresh } from "@/components/auto-refresh";
import { ObjectSwitcher } from "@/components/object-switcher";
import { PropertyTabs } from "@/components/property-tabs";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <AutoRefresh />
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <PropertyTabs />
          <div className="order-2 w-full sm:order-3 sm:w-auto">
            <ObjectSwitcher
              properties={properties}
              userName={session?.user?.name ?? ""}
              userEmail={session?.user?.email ?? ""}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

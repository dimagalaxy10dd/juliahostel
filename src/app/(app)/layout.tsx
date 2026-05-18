import Link from "next/link";
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
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/objects" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Julia" className="h-7 w-auto sm:h-8" />
            </Link>
            <ObjectSwitcher
              properties={properties}
              userName={session?.user?.name ?? ""}
              userEmail={session?.user?.email ?? ""}
            />
          </div>
          <PropertyTabs />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

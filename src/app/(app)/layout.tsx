import { auth } from "@/auth";
import { NavLink } from "@/components/nav-link";
import { ObjectSwitcher } from "@/components/object-switcher";
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
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-1">
            <NavLink href="/">Главная</NavLink>
          </nav>
          <ObjectSwitcher
            properties={properties}
            userName={session?.user?.name ?? ""}
            userEmail={session?.user?.email ?? ""}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

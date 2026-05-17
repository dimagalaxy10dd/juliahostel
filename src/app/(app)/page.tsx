import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// При входе: один объект — открываем сразу его; иначе — список объектов
// (там же добавление, если объектов ещё нет).
export default async function HomePage() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (properties.length === 1) {
    redirect(`/objects/${properties[0].id}`);
  }
  redirect("/objects");
}

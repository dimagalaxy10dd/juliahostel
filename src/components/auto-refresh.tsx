"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Периодически обновляет данные страницы, чтобы изменения с других
// устройств появлялись сами, без перезагрузки. Открытые окна и введённый
// текст при этом сохраняются. На скрытой вкладке опрос не идёт; при
// возвращении на вкладку данные обновляются сразу.
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}

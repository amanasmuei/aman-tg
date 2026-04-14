import { useEffect, useState } from "react";

export function useTelegramId(): number | null {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (typeof userId === "number") setId(userId);
  }, []);
  return id;
}

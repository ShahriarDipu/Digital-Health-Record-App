"use client";

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  requestNotificationPermission,
  startClientReminderChecker,
  syncRemindersToServiceWorker,
} from "@/lib/reminderNotifications";

export default function ReminderNotificationSync() {
  const { reminders, language, setReminders } = useAppStore();
  const isBn = language === "bn";

  const syncAll = useCallback(
    (list: typeof reminders) => {
      void syncRemindersToServiceWorker(list, isBn);
    },
    [isBn]
  );

  useEffect(() => {
    async function initNotifications() {
      const granted = await requestNotificationPermission();
      if (!granted) return;

      const current = useAppStore.getState().reminders;
      const toUnmute = current.filter(
        (r) => r.times.length > 0 && (r.mutedTimes ?? []).length === r.times.length
      );
      if (toUnmute.length === 0) return;

      setReminders(
        current.map((r) =>
          toUnmute.some((u) => u.id === r.id) ? { ...r, mutedTimes: [] } : r
        )
      );

      await Promise.all(
        toUnmute.map((r) =>
          fetch(`/api/reminders/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mutedTimes: [] }),
          })
        )
      );
    }

    void initNotifications();
  }, [setReminders]);

  useEffect(() => {
    syncAll(reminders);
    const stop = startClientReminderChecker(reminders, isBn);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncAll(useAppStore.getState().reminders);
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reminders, isBn, syncAll]);

  return null;
}

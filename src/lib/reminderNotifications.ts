import type { Reminder } from "@/store/useAppStore";
import { getMinutesFromMidnight } from "@/lib/reminderTime";

const CHECK_INTERVAL_MS = 10000;
const FIRE_GRACE_MINUTES = 1;

function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function buildNotificationContent(
  medicine: string,
  time: string,
  isBn: boolean,
  notifyBeforeMinutes = 0
) {
  const earlyNote =
    notifyBeforeMinutes > 0
      ? isBn
        ? ` (${notifyBeforeMinutes} মিনিট আগে)`
        : ` (${notifyBeforeMinutes} min early)`
      : "";

  const title = isBn ? "সময় হয়েছে! 💊" : "Medicine Time! 💊";
  const body = isBn
    ? `${medicine} খাওয়ার সময় হয়েছে — ${time}${earlyNote}`
    : `Time to take ${medicine} — ${time}${earlyNote}`;
  const tag = `med-${medicine}-${time}-${notifyBeforeMinutes}`;

  return { title, body, tag };
}

export async function showMedicineNotification(
  medicine: string,
  time: string,
  isBn: boolean,
  notifyBeforeMinutes = 0
): Promise<boolean> {
  if (!canUseNotifications()) return false;
  if (Notification.permission !== "granted") return false;

  const { title, body, tag } = buildNotificationContent(
    medicine,
    time,
    isBn,
    notifyBeforeMinutes
  );

  const options: NotificationOptions = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag,
    data: { url: "/reminders" },
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {
      /* fall through */
    }
  }

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export async function showTestNotification(isBn: boolean): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  return showMedicineNotification(
    isBn ? "টেস্ট ওষুধ" : "Test Medicine",
    isBn ? "দুপুর ১২:০০" : "12:00 PM",
    isBn,
    0
  );
}

function serializeReminders(reminders: Reminder[]) {
  return reminders.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    times: r.times,
    active: r.active,
    notifyBeforeMinutes: r.notifyBeforeMinutes ?? 0,
    mutedTimes: r.mutedTimes ?? [],
  }));
}

async function postToServiceWorker(data: object) {
  const registration = await navigator.serviceWorker.ready;
  const target =
    registration.active ||
    registration.waiting ||
    navigator.serviceWorker.controller;
  target?.postMessage(data);
}

export async function syncRemindersToServiceWorker(
  reminders: Reminder[],
  isBn = true
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    await postToServiceWorker({
      type: "REMINDER_SYNC",
      reminders: serializeReminders(reminders),
      isBn,
    });
  } catch {
    /* silent */
  }
}

function shouldFireNow(nowMinutes: number, notifyMinutes: number, fired: Set<string>, key: string) {
  if (fired.has(key)) return false;
  if (nowMinutes < notifyMinutes) return false;
  if (nowMinutes > notifyMinutes + FIRE_GRACE_MINUTES) {
    fired.add(key);
    return false;
  }
  return true;
}

export function startClientReminderChecker(
  reminders: Reminder[],
  isBn: boolean,
  intervalMs = CHECK_INTERVAL_MS
): () => void {
  if (!canUseNotifications()) {
    return () => {};
  }

  const fired = new Set<string>();

  const check = () => {
    try {
      if (Notification.permission !== "granted") return;
    } catch {
      return;
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    reminders
      .filter((r) => r.active)
      .forEach((reminder) => {
        const offset = reminder.notifyBeforeMinutes ?? 0;
        const muted = reminder.mutedTimes ?? [];

        reminder.times.forEach((time) => {
          if (muted.includes(time)) return;

          const targetMinutes = getMinutesFromMidnight(time);
          if (targetMinutes === null) return;

          const notifyMinutes = targetMinutes - offset;
          const key = `${todayKey}-${reminder.id}-${time}-${offset}`;
          if (!shouldFireNow(nowMinutes, notifyMinutes, fired, key)) return;

          void showMedicineNotification(reminder.medicineName, time, isBn, offset);
          fired.add(key);
        });
      });
  };

  check();
  const timer = setInterval(check, intervalMs);
  return () => clearInterval(timer);
}

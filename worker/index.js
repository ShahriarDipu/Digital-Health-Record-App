/* eslint-disable no-restricted-globals */

const CHECK_INTERVAL_MS = 10000;
const FIRE_GRACE_MINUTES = 1;
let reminders = [];
let notifiedKeys = new Set();
let lastReminderPayload = "";
let checkTimer = null;
let isBn = true;

function normalizeDigits(value) {
  return value.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
}

function parseTimeToMinutes(timeStr) {
  const normalized = normalizeDigits(String(timeStr || "").trim());

  const englishMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (englishMatch) {
    let hours = parseInt(englishMatch[1], 10);
    const minutes = parseInt(englishMatch[2], 10);
    const period = englishMatch[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const bengaliMatch = normalized.match(/(সকাল|দুপুর|বিকাল|রাত)\s*(\d{1,2}):(\d{2})/);
  if (bengaliMatch) {
    const period = bengaliMatch[1];
    let hours = parseInt(bengaliMatch[2], 10);
    const minutes = parseInt(bengaliMatch[3], 10);
    if (period === "সকাল") {
      if (hours === 12) hours = 0;
    } else if (period === "দুপুর" || period === "বিকাল") {
      if (hours !== 12) hours += 12;
    } else if (period === "রাত") {
      if (hours >= 1 && hours <= 11) hours += 12;
      if (hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  }

  return null;
}

function shouldFireNow(nowMinutes, notifyMinutes, key) {
  if (notifiedKeys.has(key)) return false;
  if (nowMinutes < notifyMinutes) return false;
  if (nowMinutes > notifyMinutes + FIRE_GRACE_MINUTES) {
    notifiedKeys.add(key);
    return false;
  }
  return true;
}

function checkReminders() {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  reminders.forEach((reminder) => {
    if (!reminder.active) return;
    const offset = reminder.notifyBeforeMinutes || 0;
    const muted = reminder.mutedTimes || [];

    reminder.times.forEach((time) => {
      if (muted.includes(time)) return;
      const targetMinutes = parseTimeToMinutes(time);
      if (targetMinutes === null) return;

      const notifyMinutes = targetMinutes - offset;
      const key = `${todayKey}-${reminder.id}-${time}-${offset}`;
      if (!shouldFireNow(nowMinutes, notifyMinutes, key)) return;

      const earlyNote =
        offset > 0
          ? isBn
            ? ` (${offset} মিনিট আগে)`
            : ` (${offset} min early)`
          : "";

      self.registration.showNotification(isBn ? "সময় হয়েছে! 💊" : "Medicine Time! 💊", {
        body: isBn
          ? `${reminder.medicineName} খাওয়ার সময় হয়েছে — ${time}${earlyNote}`
          : `Time to take ${reminder.medicineName} — ${time}${earlyNote}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: key,
        renotify: true,
        data: { url: "/reminders" },
      });

      notifiedKeys.add(key);
    });
  });
}

function startChecking() {
  if (checkTimer) clearInterval(checkTimer);
  checkTimer = setInterval(checkReminders, CHECK_INTERVAL_MS);
  checkReminders();
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "REMINDER_SYNC") return;

  const nextPayload = JSON.stringify(event.data.reminders || []);
  if (nextPayload !== lastReminderPayload) {
    reminders = event.data.reminders || [];
    lastReminderPayload = nextPayload;
    notifiedKeys = new Set();
  }

  isBn = event.data.isBn !== false;
  startChecking();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const url = event.notification.data?.url || "/reminders";
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

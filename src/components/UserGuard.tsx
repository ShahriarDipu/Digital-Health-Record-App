"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/useAppStore";

const STORED_USER_KEY = "shastha-sathi-user-id";

export default function UserGuard() {
  const { data: session, status } = useSession();
  const clearStore = useAppStore((s) => s.clearStore);
  const setReminders = useAppStore((s) => s.setReminders);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      // Not logged in — clear everything
      const storedUserId = localStorage.getItem(STORED_USER_KEY);
      if (storedUserId) {
        clearStore();
        localStorage.removeItem(STORED_USER_KEY);
      }
      return;
    }

    const storedUserId = localStorage.getItem(STORED_USER_KEY);

    if (storedUserId && storedUserId !== currentUserId) {
      // Different user switched — wipe all previous user's data
      clearStore();
    }

    localStorage.setItem(STORED_USER_KEY, currentUserId);

    if (!initializedRef.current) {
      initializedRef.current = true;
      // Load this user's reminders from DB
      fetch("/api/reminders")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const reminders = data.map((r: {
              id: string;
              medicineName: string;
              times: string[];
              active: boolean;
              doctorName?: string | null;
              visitId?: string | null;
              notifyBeforeMinutes?: number | null;
              mutedTimes?: string[] | null;
              createdAt: string;
            }) => ({
              id: r.id,
              medicineName: r.medicineName,
              times: r.times as string[],
              active: r.active,
              doctorName: r.doctorName ?? undefined,
              visitId: r.visitId ?? undefined,
              notifyBeforeMinutes: r.notifyBeforeMinutes ?? 0,
              mutedTimes: Array.isArray(r.mutedTimes) ? (r.mutedTimes as string[]) : [],
              createdAt: new Date(r.createdAt).toLocaleDateString("bn-BD"),
            }));
            setReminders(reminders);
          }
        })
        .catch(() => {/* silent fail */});
    }
  }, [session?.user?.id, status, clearStore, setReminders]);

  return null;
}

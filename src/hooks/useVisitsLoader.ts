"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { dbToVisit } from "@/lib/visitDb";

/** Load visits once per dashboard session — silent background refresh */
export function useVisitsLoader() {
  const setVisits = useAppStore((s) => s.setVisits);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch("/api/visits")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setVisits(data.map(dbToVisit));
        }
      })
      .catch(() => {});
  }, [setVisits]);
}

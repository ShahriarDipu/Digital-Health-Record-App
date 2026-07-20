export type DashboardTabId =
  | "home"
  | "visits"
  | "prescription"
  | "lab-report"
  | "lifestyle"
  | "reminders";

export const DASHBOARD_TAB_HREFS: Record<DashboardTabId, string> = {
  home: "/dashboard",
  visits: "/dashboard/visits",
  prescription: "/dashboard/prescription",
  "lab-report": "/dashboard/lab-report",
  lifestyle: "/dashboard/lifestyle",
  reminders: "/dashboard/reminders",
};

export function pathnameToDashboardTab(pathname: string): DashboardTabId {
  if (pathname.startsWith("/dashboard/visits")) return "visits";
  if (pathname.startsWith("/dashboard/prescription")) return "prescription";
  if (pathname.startsWith("/dashboard/lab-report")) return "lab-report";
  if (pathname.startsWith("/dashboard/lifestyle")) return "lifestyle";
  if (pathname.startsWith("/dashboard/reminders")) return "reminders";
  return "home";
}

export function isDashboardTabPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

"use client";

import dynamic from "next/dynamic";
import type { DashboardTabId } from "@/lib/dashboardRoutes";

const Dashboard = dynamic(() => import("@/components/Dashboard"), { loading: () => null });
const VisitManager = dynamic(() => import("@/components/VisitManager"), { loading: () => null });
const PrescriptionDecoder = dynamic(() => import("@/components/PrescriptionDecoder"), {
  loading: () => null,
});
const LabReportVisualizer = dynamic(() => import("@/components/LabReportVisualizer"), {
  loading: () => null,
});
const LifestyleAdvisor = dynamic(() => import("@/components/LifestyleAdvisor"), {
  loading: () => null,
});
const ReminderSystem = dynamic(() => import("@/components/ReminderSystem"), { loading: () => null });

interface DashboardTabPanelsProps {
  activeTab: DashboardTabId;
  mountedTabs: Set<DashboardTabId>;
}

function TabPanel({
  tab,
  activeTab,
  mounted,
  children,
}: {
  tab: DashboardTabId;
  activeTab: DashboardTabId;
  mounted: boolean;
  children: React.ReactNode;
}) {
  if (!mounted) return null;
  return (
    <div className={activeTab === tab ? "block" : "hidden"} aria-hidden={activeTab !== tab}>
      {children}
    </div>
  );
}

export default function DashboardTabPanels({ activeTab, mountedTabs }: DashboardTabPanelsProps) {
  return (
    <>
      <TabPanel tab="home" activeTab={activeTab} mounted={mountedTabs.has("home")}>
        <Dashboard />
      </TabPanel>
      <TabPanel tab="visits" activeTab={activeTab} mounted={mountedTabs.has("visits")}>
        <VisitManager />
      </TabPanel>
      <TabPanel tab="prescription" activeTab={activeTab} mounted={mountedTabs.has("prescription")}>
        <PrescriptionDecoder />
      </TabPanel>
      <TabPanel tab="lab-report" activeTab={activeTab} mounted={mountedTabs.has("lab-report")}>
        <LabReportVisualizer />
      </TabPanel>
      <TabPanel tab="lifestyle" activeTab={activeTab} mounted={mountedTabs.has("lifestyle")}>
        <LifestyleAdvisor />
      </TabPanel>
      <TabPanel tab="reminders" activeTab={activeTab} mounted={mountedTabs.has("reminders")}>
        <ReminderSystem />
      </TabPanel>
    </>
  );
}

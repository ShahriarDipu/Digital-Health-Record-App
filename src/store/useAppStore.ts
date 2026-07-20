import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/lib/translations";

export interface Medicine {
  name: string;
  dose: string;
  schedule: string;
  purpose: string;
  instructions: string;
  duration: string;
  // Bilingual fields — set during scan, used for language switching
  purposeBn?: string;
  purposeEn?: string;
  instructionsBn?: string;
  instructionsEn?: string;
  durationBn?: string;
  durationEn?: string;
}

export interface Prescription {
  id: string;
  doctorName: string;
  date: string;
  patientName: string;
  medicines: Medicine[];
  imageUrl?: string;
  decoded: boolean;
}

export interface LabBiomarker {
  name: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  status: "low" | "normal" | "high";
  nameBn?: string;
  nameEn?: string;
}

export interface LabReportFinding {
  titleBn: string;
  titleEn: string;
  detailBn: string;
  detailEn: string;
  status: "normal" | "concern" | "info";
}

export interface LabReport {
  id: string;
  type: string;
  date: string;
  biomarkers: LabBiomarker[];
  imageUrl?: string;
  analyzed: boolean;
  typeBn?: string;
  typeEn?: string;
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  nextStepsBn?: string[];
  nextStepsEn?: string[];
  findings?: LabReportFinding[];
}

export interface Reminder {
  id: string;
  medicineName: string;
  times: string[];
  active: boolean;
  createdAt: string;
  doctorName?: string;
  visitId?: string;
  notifyBeforeMinutes?: number;
  mutedTimes?: string[];
}


export interface HealthReport {
  summary: string;
  conditions: string[];
  prescriptionExplanation: string;
  riskLevel: "low" | "medium" | "high";
  healthScore: number;
  followUpNote?: string;
  generatedAt: string;
  // Bilingual fields
  summaryBn?: string;
  summaryEn?: string;
  conditionsBn?: string[];
  conditionsEn?: string[];
  prescriptionExplanationBn?: string;
  prescriptionExplanationEn?: string;
  followUpNoteBn?: string;
  followUpNoteEn?: string;
  sourceFingerprint?: string;
}

export interface ProgressReport {
  improved: string[];
  worsened: string[];
  unchanged: string[];
  overallTrend: "improving" | "stable" | "worsening";
  scoreChange: number;
  summary: string;
  prescriptionChanges: string[];
  doctorAdvice: string;
  generatedAt: string;
  // Bilingual fields
  summaryBn?: string;
  summaryEn?: string;
  improvedBn?: string[];
  improvedEn?: string[];
  worsenedBn?: string[];
  worsenedEn?: string[];
  unchangedBn?: string[];
  unchangedEn?: string[];
  prescriptionChangesBn?: string[];
  prescriptionChangesEn?: string[];
  doctorAdviceBn?: string;
  doctorAdviceEn?: string;
}

export interface LifestyleDirections {
  diet: string[];
  exercise: string[];
  medication: string[];
  sleep: string;
  warnings: string[];
  generatedAt: string;
  // Bilingual fields
  dietBn?: string[];
  dietEn?: string[];
  exerciseBn?: string[];
  exerciseEn?: string[];
  medicationBn?: string[];
  medicationEn?: string[];
  sleepBn?: string;
  sleepEn?: string;
  warningsBn?: string[];
  warningsEn?: string[];
}

export interface Visit {
  id: string;
  doctorName: string;
  visitDate: string;
  clinicName?: string;
  chiefComplaint?: string;
  prescriptions: Prescription[];
  labReports: LabReport[];
  healthReport?: HealthReport;
  lifestyleDirections?: LifestyleDirections;
  visitType: "initial" | "followup";
  parentVisitId?: string;
  progressReport?: ProgressReport;
  lastAnalysisFingerprint?: string;
  createdAt: string;
}

function normalizeVisitPrescriptions(
  visit: Visit & { prescription?: Prescription }
): Visit {
  if (Array.isArray(visit.prescriptions)) {
    return visit;
  }
  const legacy = visit.prescription;
  return {
    ...visit,
    prescriptions: legacy ? [legacy] : [],
  };
}

interface AppState {
  language: Language;
  setLanguage: (language: Language) => void;

  prescriptions: Prescription[];
  currentPrescription: Prescription | null;
  setPrescriptions: (prescriptions: Prescription[]) => void;
  setCurrentPrescription: (prescription: Prescription | null) => void;
  addPrescription: (prescription: Prescription) => void;

  labReports: LabReport[];
  currentLabReport: LabReport | null;
  setLabReports: (reports: LabReport[]) => void;
  setCurrentLabReport: (report: LabReport | null) => void;
  addLabReport: (report: LabReport) => void;

  reminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => void;
  toggleReminder: (id: string) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  removeRemindersByVisit: (visitId: string) => void;

  completedLifestyleCards: string[];
  toggleLifestyleCard: (id: string) => void;

  reminderModal: {
    open: boolean;
    medicineName: string;
    suggestedTimes: string[];
    doctorName?: string;
    visitId?: string;
  };
  openReminderModal: (medicineName: string, times: string[], doctorName?: string, visitId?: string) => void;
  closeReminderModal: () => void;

  visits: Visit[];
  activeVisitId: string | null;
  setVisits: (visits: Visit[]) => void;
  addVisit: (visit: Visit) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  removeVisit: (id: string) => void;
  setActiveVisitId: (id: string | null) => void;

  clearStore: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  language: "bn",
  setLanguage: (language) => set({ language }),

  prescriptions: [],
  currentPrescription: null,
  setPrescriptions: (prescriptions) => set({ prescriptions }),
  setCurrentPrescription: (prescription) => set({ currentPrescription: prescription }),
  addPrescription: (prescription) =>
    set((state) => ({ prescriptions: [...state.prescriptions, prescription] })),

  labReports: [],
  currentLabReport: null,
  setLabReports: (reports) => set({ labReports: reports }),
  setCurrentLabReport: (report) => set({ currentLabReport: report }),
  addLabReport: (report) =>
    set((state) => ({ labReports: [...state.labReports, report] })),

  reminders: [],
  setReminders: (reminders) => set({ reminders }),
  addReminder: (reminder) =>
    set((state) => ({ reminders: [...state.reminders, reminder] })),
  toggleReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      ),
    })),
  updateReminder: (id, updates) =>
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),
  removeReminder: (id) =>
    set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) })),
  removeRemindersByVisit: (visitId) =>
    set((state) => ({ reminders: state.reminders.filter((r) => r.visitId !== visitId) })),

  completedLifestyleCards: [],
  toggleLifestyleCard: (id) =>
    set((state) => ({
      completedLifestyleCards: state.completedLifestyleCards.includes(id)
        ? state.completedLifestyleCards.filter((c) => c !== id)
        : [...state.completedLifestyleCards, id],
    })),
  reminderModal: {
    open: false,
    medicineName: "",
    suggestedTimes: [],
  },
  openReminderModal: (medicineName, suggestedTimes, doctorName, visitId) =>
    set({ reminderModal: { open: true, medicineName, suggestedTimes, doctorName, visitId } }),
  closeReminderModal: () =>
    set({ reminderModal: { open: false, medicineName: "", suggestedTimes: [], doctorName: undefined, visitId: undefined } }),

  visits: [],
  activeVisitId: null,
  setVisits: (visits) => set({ visits: visits.map(normalizeVisitPrescriptions) }),
  addVisit: (visit) =>
    set((state) => ({ visits: [normalizeVisitPrescriptions(visit), ...state.visits] })),
  updateVisit: (id, updates) =>
    set((state) => ({
      visits: state.visits.map((v) =>
        v.id === id ? normalizeVisitPrescriptions({ ...v, ...updates }) : v
      ),
    })),
  removeVisit: (id) =>
    set((state) => ({ visits: state.visits.filter((v) => v.id !== id) })),
  setActiveVisitId: (id) => set({ activeVisitId: id }),

  clearStore: () =>
    set({
      visits: [],
      reminders: [],
      activeVisitId: null,
      prescriptions: [],
      currentPrescription: null,
      labReports: [],
      currentLabReport: null,
      completedLifestyleCards: [],
    }),
    }),
    {
      name: "shastha-sathi-store",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as {
          language?: Language;
          completedLifestyleCards?: string[];
          visits?: (Visit & { prescription?: Prescription })[];
        };
        if (state.visits) {
          state.visits = state.visits.map(normalizeVisitPrescriptions);
        }
        return state as {
          language: Language;
          completedLifestyleCards: string[];
          visits: Visit[];
        };
      },
      partialize: (state) => ({
        language: state.language,
        completedLifestyleCards: state.completedLifestyleCards,
        visits: state.visits,
      }),
    }
  )
);

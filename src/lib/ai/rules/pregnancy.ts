import {
  appendMeaningNote,
  appendSafetyNote,
  adjustFindings,
  findingText,
  reportTypeIs,
  rewriteText,
  textMatches,
  type MedicalRule,
  type RuleContext,
  type RuleEngineReport,
} from "./types";

function isPregnancyContext(ctx: RuleContext): boolean {
  return (
    reportTypeIs(
      ctx.report,
      "Pregnancy_USG",
      "PregnancyUltrasound",
      "pregnancy",
      "obstetric",
      "antenatal",
      "anomaly",
      "growth"
    ) ||
    textMatches(ctx.corpus, [
      /\bgestational\b/,
      /\bfetal\b/,
      /\bplacenta\b/,
      /\bcephalic\b/,
      /\bbreech\b/,
      /\bliquor\b/,
      /গর্ভ/,
    ])
  );
}

function rewriteReportFields(
  report: RuleEngineReport,
  replacements: Array<{ pattern: RegExp; replacement: string }>
): void {
  report.summaryBn = rewriteText(report.summaryBn, replacements);
  report.summaryEn = rewriteText(report.summaryEn, replacements);
  report.meaningBn = rewriteText(report.meaningBn, replacements);
  report.meaningEn = rewriteText(report.meaningEn, replacements);
  if (report.impression) {
    report.impression.bn = rewriteText(report.impression.bn, replacements);
    report.impression.en = rewriteText(report.impression.en, replacements);
  }
  if (report.conclusion) {
    report.conclusion.bn = rewriteText(report.conclusion.bn, replacements);
    report.conclusion.en = rewriteText(report.conclusion.en, replacements);
  }
  for (const f of report.findings ?? []) {
    f.detailBn = rewriteText(f.detailBn, replacements);
    f.detailEn = rewriteText(f.detailEn, replacements);
  }
}

const AWAY_FROM_OS = [
  /posterior\s+placenta[^.]{0,80}away\s+from\s+(the\s+)?os/i,
  /placenta\s+posterior[^.]{0,80}away\s+from\s+(the\s+)?os/i,
  /anterior\s+placenta[^.]{0,80}away\s+from\s+(the\s+)?os/i,
  /placenta\s+anterior[^.]{0,80}away\s+from\s+(the\s+)?os/i,
  /placenta[^.]{0,60}away\s+from\s+(the\s+)?(internal\s+)?os/i,
];

/** Posterior/anterior placenta away from os → normal; never call low-lying. */
const placentaAwayFromOsRule: MedicalRule = {
  id: "pregnancy.placenta_away_from_os",
  label: "Placenta away from os is normal (not low-lying)",
  matches: isPregnancyContext,
  apply(ctx) {
    const { report } = ctx;
    const hasAway = AWAY_FROM_OS.some((p) => p.test(ctx.corpus));
    if (!hasAway) return;

    // Correct misleading "low-lying" wording when report says away from os
    rewriteReportFields(report, [
      {
        pattern:
          /low[\-\s]?lying\s+placenta(?=[^.]{0,40}away\s+from\s+(the\s+)?os)/gi,
        replacement: "placenta (away from the os — not low-lying)",
      },
      {
        pattern:
          /placenta\s+is\s+low[\-\s]?lying(?=[^.]{0,40}away\s+from)/gi,
        replacement: "placenta is away from the os (not low-lying)",
      },
    ]);

    adjustFindings(
      report,
      (f) =>
        textMatches(findingText(f), AWAY_FROM_OS) ||
        (textMatches(findingText(f), [/\bplacenta\b/]) &&
          textMatches(findingText(f), [/away\s+from\s+(the\s+)?os/])),
      { status: "normal" }
    );

    // If a finding wrongly marked concern only due to placenta position + away from os
    for (const f of report.findings ?? []) {
      const t = findingText(f);
      if (
        textMatches(t, [/away\s+from\s+(the\s+)?os/]) &&
        textMatches(t, [/\bplacenta\b/]) &&
        !textMatches(t, [/low[\-\s]?lying/, /previa/])
      ) {
        f.status = "normal";
      }
    }

    appendSafetyNote(
      report,
      "প্লাসেন্টা os থেকে দূরে থাকলে এটি সাধারণত স্বাভাবিক অবস্থান — low-lying placenta নয়।",
      "When the placenta is away from the os, this is usually a normal position — not a low-lying placenta."
    );
  },
};

/** Explicit low-lying placenta → concern. */
const lowLyingPlacentaRule: MedicalRule = {
  id: "pregnancy.low_lying_placenta",
  label: "Low-lying placenta → concern",
  matches: isPregnancyContext,
  apply(ctx) {
    const { report } = ctx;
    const patterns = [/low[\-\s]?lying\s+placenta/i, /placenta\s+is\s+low[\-\s]?lying/i];
    if (!textMatches(ctx.corpus, patterns)) return;

    // Do not override if text also says away from os (handled by previous rule)
    if (textMatches(ctx.corpus, [/away\s+from\s+(the\s+)?os/])) return;

    adjustFindings(
      report,
      (f) => textMatches(findingText(f), patterns),
      { status: "concern" }
    );
  },
};

/** Placenta previa → high concern (status: concern + safety note). */
const placentaPreviaRule: MedicalRule = {
  id: "pregnancy.placenta_previa",
  label: "Placenta previa → high concern",
  matches: isPregnancyContext,
  apply(ctx) {
    const patterns = [/placenta\s+previa/i, /\bprevia\b/i];
    if (!textMatches(ctx.corpus, patterns)) return;

    adjustFindings(
      ctx.report,
      (f) => textMatches(findingText(f), [/placenta/, /previa/]),
      { status: "concern" }
    );

    appendSafetyNote(
      ctx.report,
      "রিপোর্টে placenta previa থাকলে এটি গুরুত্বপূর্ণ বিষয় — অবশ্যই চিকিৎসকের সাথে আলোচনা করুন।",
      "Placenta previa on the report is a high-concern finding — discuss promptly with your doctor."
    );
    appendMeaningNote(
      ctx.report,
      "এটি নিজে থেকে রোগ নির্ণয় নয়; রিপোর্টে যা লেখা আছে তাই দেখানো হয়েছে।",
      "This is not a new diagnosis; it reflects what the report already states."
    );
  },
};

/** Cephalic presentation → normal. */
const cephalicPresentationRule: MedicalRule = {
  id: "pregnancy.cephalic_presentation",
  label: "Cephalic presentation → normal",
  matches: isPregnancyContext,
  apply(ctx) {
    const patterns = [/cephalic\s+presentation/i, /\bcephalic\b/i, /vertex\s+presentation/i];
    if (!textMatches(ctx.corpus, patterns)) return;

    adjustFindings(
      ctx.report,
      (f) => textMatches(findingText(f), [/cephalic/, /vertex\s+presentation/]),
      { status: "normal" }
    );
  },
};

/** Breech → info only; never abnormal by itself. */
const breechPresentationRule: MedicalRule = {
  id: "pregnancy.breech_presentation",
  label: "Breech presentation → informational only",
  matches: isPregnancyContext,
  apply(ctx) {
    const patterns = [/breech\s+presentation/i, /\bbreech\b/i];
    if (!textMatches(ctx.corpus, patterns)) return;

    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), patterns)) continue;
      // Downgrade abnormal/concern labeling for breech alone
      if (f.status === "concern") f.status = "info";

      f.detailEn = rewriteText(f.detailEn, [
        {
          pattern: /\b(abnormal|dangerous|critical|serious\s+problem)\b/gi,
          replacement: "notable",
        },
      ]);
      f.detailBn = rewriteText(f.detailBn, [
        {
          pattern: /(অস্বাভাবিক|বিপজ্জনক|গুরুতর\s+সমস্যা)/g,
          replacement: "উল্লেখযোগ্য",
        },
      ]);
    }

    appendSafetyNote(
      ctx.report,
      "Breech presentation একাই অস্বাভাবিক রোগ নয় — চিকিৎসক পরিস্থিতি দেখে বলবেন।",
      "Breech presentation by itself is not an abnormality — your doctor will interpret it in context."
    );
  },
};

export const pregnancyRules: MedicalRule[] = [
  placentaAwayFromOsRule,
  lowLyingPlacentaRule,
  placentaPreviaRule,
  cephalicPresentationRule,
  breechPresentationRule,
];

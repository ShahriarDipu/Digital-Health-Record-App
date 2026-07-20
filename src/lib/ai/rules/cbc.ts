import {
  appendSafetyNote,
  findingText,
  reportTypeIs,
  rewriteText,
  textMatches,
  type MedicalRule,
  type RuleContext,
} from "./types";

function isCbcContext(ctx: RuleContext): boolean {
  return (
    reportTypeIs(ctx.report, "CBC", "complete blood") ||
    textMatches(ctx.corpus, [
      /\bcbc\b/,
      /complete\s+blood\s+count/,
      /\bhemoglobin\b/,
      /\bhb\b/,
      /\bwbc\b/,
      /platelet/,
      /হিমোগ্লোবিন/,
    ])
  );
}

function biomarkerIsLow(ctx: RuleContext, namePattern: RegExp): boolean {
  return (ctx.report.biomarkers ?? []).some(
    (b) =>
      b.status === "low" &&
      namePattern.test(`${b.name} ${b.nameBn ?? ""} ${b.nameEn ?? ""}`.toLowerCase())
  );
}

function biomarkerIsHigh(ctx: RuleContext, namePattern: RegExp): boolean {
  return (ctx.report.biomarkers ?? []).some(
    (b) =>
      b.status === "high" &&
      namePattern.test(`${b.name} ${b.nameBn ?? ""} ${b.nameEn ?? ""}`.toLowerCase())
  );
}

/** Low hemoglobin → possible anemia; never confirmed unless report diagnoses it. */
const lowHemoglobinRule: MedicalRule = {
  id: "cbc.low_hemoglobin_possible_anemia",
  label: "Low hemoglobin → possible anemia (not confirmed)",
  matches: isCbcContext,
  apply(ctx) {
    const hbLow =
      biomarkerIsLow(ctx, /ha?emoglobin|\bhb\b/) ||
      textMatches(ctx.corpus, [/low\s+ha?emoglobin/i, /ha?emoglobin\s+is\s+low/i]);

    if (!hbLow) return;

    const explicitAnemia = textMatches(ctx.corpus, [
      /\bdiagnosed\s+with\s+anemia\b/i,
      /\banemia\s+diagnosed\b/i,
      /impression\s*[:\-].{0,40}\ban(a)?emia\b/i,
    ]);

    if (explicitAnemia) return;

    const enRepl = [
      {
        pattern: /\b(you\s+have|has|confirmed|definite|definitely)\s+an(a)?emia\b/gi,
        replacement: "possible anemia (needs doctor confirmation)",
      },
      {
        pattern: /\bconfirmed\s+an(a)?emia\b/gi,
        replacement: "possible anemia",
      },
    ];
    const bnRepl = [
      {
        pattern: /(নিশ্চিত\s+)?রক্তশূন্যতা\s+আছে|আপনার\s+অ্যানিমিয়া\s+আছে/g,
        replacement: "রক্তশূন্যতার সম্ভাবনা থাকতে পারে (ডাক্তার নিশ্চিত করবেন)",
      },
    ];

    ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, enRepl);
    ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, enRepl);
    ctx.report.summaryBn = rewriteText(ctx.report.summaryBn, bnRepl);
    ctx.report.meaningBn = rewriteText(ctx.report.meaningBn, bnRepl);

    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), [/ha?emoglobin|\bhb\b|an(a)?emia/i])) continue;
      f.detailEn = rewriteText(f.detailEn, enRepl);
      f.detailBn = rewriteText(f.detailBn, bnRepl);
    }

    appendSafetyNote(
      ctx.report,
      "হিমোগ্লোবিন কম হলে রক্তশূন্যতার সম্ভাবনা থাকতে পারে — রিপোর্টে নির্ণয় না থাকলে নিশ্চিত অ্যানিমিয়া বলা যাবে না।",
      "Low hemoglobin suggests possible anemia — do not treat as confirmed anemia unless the report diagnoses it."
    );
  },
};

/** High WBC → possible infection/inflammation; never confirm infection. */
const highWbcRule: MedicalRule = {
  id: "cbc.high_wbc_possible_infection",
  label: "High WBC → possible infection/inflammation (not confirmed)",
  matches: isCbcContext,
  apply(ctx) {
    const wbcHigh =
      biomarkerIsHigh(ctx, /\bwbc\b|white\s+blood|total\s+count|leucocyte|leukocyte/) ||
      textMatches(ctx.corpus, [/high\s+wbc/i, /wbc\s+is\s+high/i, /leukocytosis/i]);

    if (!wbcHigh) return;

    const explicitInfection = textMatches(ctx.corpus, [
      /\bdiagnosed\s+.{0,20}infection\b/i,
      /impression\s*[:\-].{0,40}\binfection\b/i,
    ]);
    if (explicitInfection) return;

    const enRepl = [
      {
        pattern:
          /\b(you\s+have|has|confirmed|definite|definitely)\s+(an\s+)?infection\b/gi,
        replacement: "possible infection or inflammation (needs doctor correlation)",
      },
      {
        pattern: /\bconfirmed\s+infection\b/gi,
        replacement: "possible infection or inflammation",
      },
    ];
    const bnRepl = [
      {
        pattern: /(নিশ্চিত\s+)?সংক্রমণ\s+আছে|ইনফেকশন\s+নিশ্চিত/g,
        replacement: "সংক্রমণ বা প্রদাহের সম্ভাবনা থাকতে পারে (ডাক্তার দেখবেন)",
      },
    ];

    ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, enRepl);
    ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, enRepl);
    ctx.report.summaryBn = rewriteText(ctx.report.summaryBn, bnRepl);
    ctx.report.meaningBn = rewriteText(ctx.report.meaningBn, bnRepl);

    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), [/\bwbc\b|infection|leukocytosis/i])) continue;
      f.detailEn = rewriteText(f.detailEn, enRepl);
      f.detailBn = rewriteText(f.detailBn, bnRepl);
    }

    appendSafetyNote(
      ctx.report,
      "WBC বেশি হলে সংক্রমণ বা প্রদাহ হতে পারে — একাধারে ইনফেকশন নিশ্চিত নয়।",
      "High WBC may suggest infection or inflammation — it does not confirm infection by itself."
    );
  },
};

export const cbcRules: MedicalRule[] = [lowHemoglobinRule, highWbcRule];

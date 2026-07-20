import {
  appendMeaningNote,
  appendSafetyNote,
  findingText,
  reportTypeIs,
  rewriteText,
  textMatches,
  type MedicalRule,
  type RuleContext,
} from "./types";

function isWholeAbdomen(ctx: RuleContext): boolean {
  return (
    reportTypeIs(ctx.report, "Whole_Abdomen", "WholeAbdomen", "whole abdomen", "w/a") ||
    textMatches(ctx.corpus, [
      /whole\s+abdomen/,
      /ultrasonogram\s+of\s+(the\s+)?whole\s+abdomen/,
      /upper\s+(and\s+)?lower\s+abdomen/,
      /\bliver\b.*\bkidney/,
    ])
  );
}

/** Enlarged ovary ≠ PCOS. */
const enlargedOvaryNotPcosRule: MedicalRule = {
  id: "abdomen.enlarged_ovary_not_pcos",
  label: "Enlarged ovary ≠ PCOS",
  matches: (ctx) =>
    isWholeAbdomen(ctx) ||
    textMatches(ctx.corpus, [/enlarged\s+ovar/i, /ovar\w*\s+enlarged/i]),
  apply(ctx) {
    const ovaryEnlarge = [/enlarged\s+ovar/i, /ovar\w*\s+(is\s+)?enlarged/i, /bulky\s+ovar/i];
    if (!textMatches(ctx.corpus, ovaryEnlarge)) return;

    const enRepl = [
      {
        pattern:
          /\b(enlarged|bulky)\s+ovar\w*[^.]*\b(means|indicates|confirms|suggests)\s+PCOS\b/gi,
        replacement:
          "enlarged ovary as written on the report (this alone does not confirm PCOS)",
      },
      {
        pattern: /\bPCOS\b(?=[^.]{0,60}enlarged\s+ovar)/gi,
        replacement: "polycystic features (not confirmed by ovary size alone)",
      },
    ];

    ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, enRepl);
    ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, enRepl);
    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), ovaryEnlarge) && !/pcos/i.test(findingText(f))) {
        continue;
      }
      f.detailEn = rewriteText(f.detailEn, enRepl);
      if (f.status === "concern" && !textMatches(findingText(f), [/polycystic\s+ovary\s+syndrome/i])) {
        // Size alone is not a PCOS diagnosis
        if (!textMatches(findingText(f), [/polycystic/i])) f.status = "info";
      }
    }

    appendSafetyNote(
      ctx.report,
      "ডিম্বাশয় বড় হলেই PCOS হয় না।",
      "An enlarged ovary alone does not mean PCOS."
    );
  },
};

/**
 * Fatty liver grade must exactly match the report.
 * Softens invented grade escalation (e.g. "grade 1" described as severe grade 3).
 */
const fattyLiverGradeRule: MedicalRule = {
  id: "abdomen.fatty_liver_grade_exact",
  label: "Fatty liver grade must match report exactly",
  matches: (ctx) =>
    isWholeAbdomen(ctx) || textMatches(ctx.corpus, [/fatty\s+liver/i, /hepatic\s+steatosis/i]),
  apply(ctx) {
    if (!textMatches(ctx.corpus, [/fatty\s+liver/i, /hepatic\s+steatosis/i])) return;

    // Detect printed grade if present (grade I/II/III or 1/2/3)
    const gradeMatch = ctx.corpus.match(
      /fatty\s+liver[^.\n]{0,40}grade\s*([i1]|[ii2]|[iii3]|1|2|3)/i
    ) || ctx.corpus.match(/grade\s*([i1]|ii|iii|1|2|3)[^.\n]{0,40}fatty\s+liver/i);

    if (gradeMatch) {
      const printed = gradeMatch[1].toLowerCase();
      const normalized =
        printed === "i" || printed === "1"
          ? "1"
          : printed === "ii" || printed === "2"
            ? "2"
            : printed === "iii" || printed === "3"
              ? "3"
              : printed;

      // Remove contradictory higher-grade claims in explanations
      if (normalized === "1") {
        const soften = [
          {
            pattern: /fatty\s+liver[^.\n]{0,30}grade\s*(3|iii|II)/gi,
            replacement: "fatty liver grade 1 (as on the report)",
          },
          {
            pattern: /\b(severe|advanced)\s+fatty\s+liver\b/gi,
            replacement: "fatty liver (grade as printed on the report)",
          },
        ];
        ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, soften);
        ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, soften);
        for (const f of ctx.report.findings ?? []) {
          f.detailEn = rewriteText(f.detailEn, soften);
        }
      }
    }

    appendMeaningNote(
      ctx.report,
      "Fatty liver-এর গ্রেড শুধু রিপোর্টে যা লেখা আছে সেই অনুযায়ী দেখানো হয়েছে।",
      "Fatty liver grade is shown exactly as printed on the report — not upgraded or invented."
    );
  },
};

export const abdomenRules: MedicalRule[] = [
  enlargedOvaryNotPcosRule,
  fattyLiverGradeRule,
];

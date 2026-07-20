import {
  appendSafetyNote,
  findingText,
  reportTypeIs,
  rewriteText,
  textMatches,
  type MedicalRule,
  type RuleContext,
} from "./types";

function isUrineContext(ctx: RuleContext): boolean {
  return (
    reportTypeIs(ctx.report, "Urine", "urine") ||
    textMatches(ctx.corpus, [
      /\burine\b/,
      /\burinalysis\b/,
      /urine\s*r\/?e/,
      /pus\s*cells/,
      /প্রস্রাব/,
    ])
  );
}

function softenDiagnosis(
  ctx: RuleContext,
  findingPatterns: RegExp[],
  bannedEn: RegExp,
  bannedBn: RegExp,
  enReplacement: string,
  bnReplacement: string,
  noteBn: string,
  noteEn: string
): void {
  if (!textMatches(ctx.corpus, findingPatterns)) return;

  const enRepl = [{ pattern: bannedEn, replacement: enReplacement }];
  const bnRepl = [{ pattern: bannedBn, replacement: bnReplacement }];

  ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, enRepl);
  ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, enRepl);
  ctx.report.summaryBn = rewriteText(ctx.report.summaryBn, bnRepl);
  ctx.report.meaningBn = rewriteText(ctx.report.meaningBn, bnRepl);

  for (const f of ctx.report.findings ?? []) {
    if (!textMatches(findingText(f), findingPatterns) && !bannedEn.test(findingText(f))) {
      continue;
    }
    f.detailEn = rewriteText(f.detailEn, enRepl);
    f.detailBn = rewriteText(f.detailBn, bnRepl);
  }

  appendSafetyNote(ctx.report, noteBn, noteEn);
}

/** Pus cells ≠ confirmed UTI. */
const pusCellsNotUtiRule: MedicalRule = {
  id: "urine.pus_cells_not_uti",
  label: "Pus cells ≠ confirmed UTI",
  matches: isUrineContext,
  apply(ctx) {
    softenDiagnosis(
      ctx,
      [/pus\s*cells/i, /leukocyte/i, /wbc\s*\/?\s*hpf/i],
      /\b(confirmed\s+)?(UTI|urinary\s+tract\s+infection)\b/gi,
      /(নিশ্চিত\s+)?ইউটিআই|মূত্রনালীর\s+সংক্রমণ\s+নিশ্চিত/g,
      "possible urine infection — needs doctor correlation (not confirmed by pus cells alone)",
      "প্রস্রাবে সংক্রমণের সম্ভাবনা থাকতে পারে — শুধু pus cells দিয়ে নিশ্চিত নয়",
      "Pus cells থাকলেই UTI নিশ্চিত হয় না।",
      "Pus cells alone do not confirm a UTI."
    );
  },
};

/** RBC in urine ≠ kidney disease. */
const rbcNotKidneyDiseaseRule: MedicalRule = {
  id: "urine.rbc_not_kidney_disease",
  label: "RBC in urine ≠ kidney disease",
  matches: isUrineContext,
  apply(ctx) {
    softenDiagnosis(
      ctx,
      [/rbc/i, /red\s+blood\s+cells/i, /haematuria/i, /hematuria/i, /erythrocyte/i],
      /\b(kidney\s+disease|renal\s+failure|ckd|chronic\s+kidney)\b/gi,
      /(কিডনি\s+রোগ|কিডনি\s+ফেইলিউর|রেনাল\s+ফেইলিউর)/g,
      "blood cells in urine as reported — not automatically kidney disease",
      "প্রস্রাবে RBC আছে বলে রিপোর্টে লেখা — একাধারে কিডনি রোগ নয়",
      "প্রস্রাবে RBC থাকলেই কিডনি রোগ বোঝায় না।",
      "RBC in urine alone does not mean kidney disease."
    );
  },
};

export const urineRules: MedicalRule[] = [
  pusCellsNotUtiRule,
  rbcNotKidneyDiseaseRule,
];

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

function isTvsOrPelvic(ctx: RuleContext): boolean {
  return (
    reportTypeIs(
      ctx.report,
      "TVS",
      "Pelvic_USG",
      "PelvicUltrasound",
      "Folliculometry",
      "pelvic",
      "transvaginal"
    ) ||
    textMatches(ctx.corpus, [
      /\btvs\b/,
      /\btransvaginal\b/,
      /\bpelvic\s+(usg|ultrasound|sono)/,
      /\bendometrium\b/,
      /\bovary\b/,
      /\bovaries\b/,
      /ডিম্বাশয়/,
      /জরায়ু/,
    ])
  );
}

function stripPcosDiagnosisWording(report: RuleEngineReport): void {
  const enReplacements = [
    {
      pattern:
        /\b(you\s+have|patient\s+has|diagnosed\s+with|this\s+confirms|this\s+means\s+you\s+have)\s+PCOS\b/gi,
      replacement: "the report describes polycystic ovarian features (this alone does not confirm PCOS)",
    },
    {
      pattern: /\bPCOS\s+diagnosis\b/gi,
      replacement: "polycystic ovarian appearance (not a PCOS diagnosis by itself)",
    },
    {
      pattern: /\b(has|have|with)\s+PCOS\b(?!\s*\/\s*Polycystic)/gi,
      replacement: "has polycystic ovarian features on ultrasound (not automatically PCOS)",
    },
  ];

  const bnReplacements = [
    {
      pattern: /আপনার\s+PCOS\s+আছে/g,
      replacement:
        "আল্ট্রাসাউন্ডে পলিসিস্টিক ডিম্বাশয়ের বৈশিষ্ট্য দেখা গেছে (একাধারে PCOS নিশ্চিত নয়)",
    },
    {
      pattern: /PCOS\s+নির্ণয়/g,
      replacement: "পলিসিস্টিক ডিম্বাশয়ের বর্ণনা (একাধারে PCOS নির্ণয় নয়)",
    },
  ];

  report.summaryEn = rewriteText(report.summaryEn, enReplacements);
  report.meaningEn = rewriteText(report.meaningEn, enReplacements);
  report.summaryBn = rewriteText(report.summaryBn, bnReplacements);
  report.meaningBn = rewriteText(report.meaningBn, bnReplacements);

  for (const f of report.findings ?? []) {
    f.detailEn = rewriteText(f.detailEn, enReplacements);
    f.detailBn = rewriteText(f.detailBn, bnReplacements);
  }
}

/** Polycystic ovaries / multiple peripheral follicles ≠ PCOS diagnosis. */
const polycysticNotPcosRule: MedicalRule = {
  id: "tvs.polycystic_not_pcos",
  label: "Polycystic ovaries ≠ PCOS diagnosis",
  matches: isTvsOrPelvic,
  apply(ctx) {
    const morphPatterns = [
      /polycystic\s+ovar/i,
      /polycystic\s+ovarian\s+morphology/i,
      /multiple\s+peripheral\s+follicles/i,
      /peripheral\s+follicles/i,
      /pco\s+morphology/i,
    ];

    const hasMorphology = textMatches(ctx.corpus, morphPatterns);
    if (!hasMorphology) return;

    // Explicit PCOS written as diagnosis on report — do not strip the word entirely,
    // but still add safety clarification if morphology language is also present.
    const explicitPcosDiagnosis = textMatches(ctx.corpus, [
      /polycystic\s+ovary\s+syndrome/i,
      /\bdiagnosis\s*[:\-]?\s*PCOS\b/i,
      /impression\s*[:\-].{0,40}\bPCOS\b/i,
    ]);

    stripPcosDiagnosisWording(ctx.report);

    for (const f of ctx.report.findings ?? []) {
      const t = findingText(f);
      if (!textMatches(t, morphPatterns)) continue;
      // Morphology alone should not be escalated as disease confirmation
      if (f.status === "concern" && !explicitPcosDiagnosis) {
        f.status = "info";
      }
    }

    if (!explicitPcosDiagnosis) {
      appendMeaningNote(
        ctx.report,
        "পলিসিস্টিক ডিম্বাশয় বা peripheral follicles দেখা গেলেই PCOS নিশ্চিত হয় না।",
        "Polycystic ovaries or multiple peripheral follicles alone do not confirm PCOS."
      );
      appendSafetyNote(
        ctx.report,
        "PCOS একটি ক্লিনিকাল নির্ণয় — শুধু আল্ট্রাসাউন্ড দিয়ে নিশ্চিত করা যায় না।",
        "PCOS is a clinical diagnosis — ultrasound appearance alone cannot confirm it."
      );
    }
  },
};

/** No dominant follicle → explain only; never conclude infertility. */
const noDominantFollicleRule: MedicalRule = {
  id: "tvs.no_dominant_follicle",
  label: "No dominant follicle ≠ infertility",
  matches: isTvsOrPelvic,
  apply(ctx) {
    const patterns = [
      /no\s+dominant\s+follicle/i,
      /dominant\s+follicle\s+not\s+(seen|visualized)/i,
      /absence\s+of\s+dominant\s+follicle/i,
    ];
    if (!textMatches(ctx.corpus, patterns)) return;

    const infertilityWording = [
      {
        pattern:
          /\b(infertile|infertility|cannot\s+conceive|unable\s+to\s+get\s+pregnant|barren)\b/gi,
        replacement: "as stated on the report regarding follicles",
      },
    ];
    const bnInfertility = [
      {
        pattern: /(বন্ধ্যাত্ব|সন্তান\s+ধারণে\s+অক্ষম|গর্ভধারণ\s+করতে\s+পারবেন\s+না)/g,
        replacement: "রিপোর্টে ফলিকল সম্পর্কে যা লেখা আছে",
      },
    ];

    ctx.report.summaryEn = rewriteText(ctx.report.summaryEn, infertilityWording);
    ctx.report.meaningEn = rewriteText(ctx.report.meaningEn, infertilityWording);
    ctx.report.summaryBn = rewriteText(ctx.report.summaryBn, bnInfertility);
    ctx.report.meaningBn = rewriteText(ctx.report.meaningBn, bnInfertility);

    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), patterns) && !textMatches(findingText(f), [/infertil/i])) {
        continue;
      }
      f.detailEn = rewriteText(f.detailEn, infertilityWording);
      f.detailBn = rewriteText(f.detailBn, bnInfertility);
      if (f.status === "concern") f.status = "info";
    }

    appendSafetyNote(
      ctx.report,
      "Dominant follicle না দেখা গেলেই বন্ধ্যাত্ব বোঝায় না — শুধু রিপোর্টে যা আছে তাই বলা হয়েছে।",
      "No dominant follicle does not mean infertility — only the report statement is explained."
    );
  },
};

/** Retroverted uterus → usually normal anatomical variation. */
const retrovertedUterusRule: MedicalRule = {
  id: "tvs.retroverted_uterus",
  label: "Retroverted uterus → usually normal variation",
  matches: isTvsOrPelvic,
  apply(ctx) {
    const patterns = [/retroverted\s+uterus/i, /uterus\s+is\s+retroverted/i, /retroverted\s+av\s*f/i];
    if (!textMatches(ctx.corpus, patterns)) return;

    adjustFindings(
      ctx.report,
      (f) => textMatches(findingText(f), [/retroverted/]),
      { status: "info" }
    );

    for (const f of ctx.report.findings ?? []) {
      if (!textMatches(findingText(f), [/retroverted/])) continue;
      if (f.status === "concern") f.status = "info";
      f.detailEn = rewriteText(f.detailEn, [
        {
          pattern: /\b(abnormal|defect|deformity|problem)\b/gi,
          replacement: "anatomical variation",
        },
      ]);
    }

    appendMeaningNote(
      ctx.report,
      "Retroverted uterus সাধারণত একটি স্বাভাবিক শারীরবৃত্তীয় ভিন্নতা।",
      "A retroverted uterus is usually a normal anatomical variation."
    );
  },
};

export const tvsRules: MedicalRule[] = [
  polycysticNotPcosRule,
  noDominantFollicleRule,
  retrovertedUterusRule,
];

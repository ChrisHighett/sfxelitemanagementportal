/**
 * Smart field population for review summaries.
 * If a primary field is empty/blank, falls back to other populated fields.
 */

interface ReviewData {
  performance?: string;
  lifestyle?: string;
  personal?: string;
  education?: string;
  brand?: string;
  focus?: string;
  trainingHighlights?: string | null;
  areasForImprovement?: string | null;
  footballGoal?: string | null;
  personalGoal?: string | null;
  schoolLifeGoal?: string | null;
  educationTopic?: string | null;
  parentEngagementNotes?: string | null;
  followUpActions?: string | null;
}

const EMPTY = "—";

function isBlank(v: string | null | undefined): boolean {
  return !v || v.trim() === "" || v.trim() === EMPTY;
}

/** Pick the first non-blank value from a list */
function firstNonBlank(...values: (string | null | undefined)[]): string {
  for (const v of values) {
    if (!isBlank(v)) return v!.trim();
  }
  return EMPTY;
}

/** Scan all provided fields for keywords; return first field containing a match */
function scanForKeywords(
  keywords: string[],
  ...fields: (string | null | undefined)[]
): string | null {
  const pattern = new RegExp(keywords.join("|"), "i");
  for (const f of fields) {
    if (!isBlank(f) && pattern.test(f!)) return f!.trim();
  }
  return null;
}

export interface SmartReviewFields {
  performance: string;
  lifestyle: string;
  personal: string;
  education: string;
  focus: string;
  brand: string;
}

export function resolveSmartFields(r: ReviewData): SmartReviewFields {
  const allNotes = [
    r.trainingHighlights,
    r.areasForImprovement,
    r.followUpActions,
    r.educationTopic,
    r.parentEngagementNotes,
    r.footballGoal,
    r.personalGoal,
    r.schoolLifeGoal,
  ];

  // 1. Performance
  const performance = firstNonBlank(
    r.performance,
    r.trainingHighlights,
    r.areasForImprovement,
    r.footballGoal,
    r.followUpActions,
  );

  // 2. Lifestyle
  let lifestyle = r.lifestyle;
  if (isBlank(lifestyle)) {
    // Try keyword scan first
    const keywordHit = scanForKeywords(
      ["recovery", "sleep", "routine", "discipline", "rest", "nutrition", "diet", "fitness"],
      ...allNotes,
    );
    lifestyle = keywordHit ?? firstNonBlank(
      r.educationTopic,
      r.followUpActions,
    );
  }

  // 3. Personal
  const personal = firstNonBlank(
    r.personal,
    r.personalGoal,
    r.educationTopic,
    r.parentEngagementNotes,
  );

  // 4. Next Focus
  const focus = firstNonBlank(
    r.focus,
    r.followUpActions,
    r.areasForImprovement,
    r.footballGoal,
    r.personalGoal,
    r.schoolLifeGoal,
  );

  // 5. Education
  const education = firstNonBlank(
    r.education,
    r.educationTopic,
    scanForKeywords(
      ["education", "school", "learning", "study", "academic", "development"],
      r.parentEngagementNotes,
      r.followUpActions,
    ),
  );

  // 6. Brand (simple fallback)
  const brand = firstNonBlank(r.brand);

  return { performance, lifestyle: lifestyle ?? EMPTY, personal, education, focus, brand };
}

/**
 * Shared prompt builders for the local LLM.
 * Mirrors backend/app/core/llm_engine.py FACTUALITY_RULES so the small
 * model obeys the same truthfulness contract as Gemini.
 */
export const FACTUALITY_RULES =
  "STRICT FACTUALITY RULES: do not invent metrics, percentages, results, " +
  "technologies, responsibilities, employers, dates, degrees or contact details. " +
  "Preserve every factual claim from the original. If evidence is missing, leave it " +
  "missing or write an explicit placeholder like [missing metric].";

export function buildBulletPrompt(
  bullet: string,
  roleContext = "",
  targetKeywords: string[] = []
): string {
  const keywordsStr = targetKeywords.join(", ");
  return (
    "You are an expert resume editor. Rewrite one work bullet for clarity using a " +
    `strong action verb.\n${FACTUALITY_RULES}\n` +
    `Role context: ${roleContext || "Professional"}\n` +
    `Keywords to include naturally ONLY if already implied: ${keywordsStr}\n` +
    `Original bullet: "${bullet}"\n` +
    'Return ONLY valid JSON: {"original": str, "improved_star": str, ' +
    '"formula_breakdown": {"action_verb": str, "accomplishment_x": str, ' +
    '"measurement_y": str, "method_z": str}, "why_ats_loves_it": str}'
  );
}

export function buildSummaryPrompt(
  currentSummary: string,
  jobDescription: string,
  keySkills: string[] = []
): string {
  return (
    "You are a senior recruiting advisor. Draft a 3-4 line professional summary.\n" +
    `${FACTUALITY_RULES}\n` +
    `Current summary: ${currentSummary}\nJob description: ${jobDescription.slice(0, 4000)}\n` +
    `Key skills: ${keySkills.join(", ")}\n` +
    'Return ONLY valid JSON: {"tailored_summary": str, ' +
    '"keywords_included": [str], "tips": [str]}'
  );
}

export function buildAssistantPrompt(
  question: string,
  resumeText: string,
  jobText = "",
  auditSummary = ""
): string {
  return (
    "You are a helpful resume assistant inside an ATS-readability tool. " +
    "Answer concisely in the user's language (Spanish or English). " +
    `${FACTUALITY_RULES} Never invent employers, dates, metrics or contact ` +
    "details. Ground every claim in the CV excerpt below. If the answer is not " +
    "supported by the CV, say so explicitly.\n\n" +
    `CV excerpt:\n${resumeText.slice(0, 6000)}\n\n` +
    (jobText ? `Job offer excerpt:\n${jobText.slice(0, 3000)}\n\n` : "") +
    (auditSummary ? `Audit signals:\n${auditSummary.slice(0, 1500)}\n\n` : "") +
    `User question: ${question.slice(0, 2000)}\n\n` +
    "Reply in plain text (no JSON), max 12 lines, with actionable advice."
  );
}

/** Extract the first JSON object from a model reply (small models add chatter). */
export function extractJsonObject(text: string): unknown | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

const METRIC_RE = /\d+\s*%|\b\d+x\b|[$€£¥]\s*\d+/i;

export function introducesHallucinatedMetric(original: string, candidate: string): boolean {
  if (!candidate || !METRIC_RE.test(candidate)) return false;
  const grab = (s: string) => new Set((s.match(new RegExp(METRIC_RE.source, "gi")) ?? []));
  const orig = grab(original || "");
  const cand = grab(candidate || "");
  for (const m of cand) if (!orig.has(m)) return true;
  return false;
}

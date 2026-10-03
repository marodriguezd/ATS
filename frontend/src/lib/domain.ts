/**
 * Canonical ATS domain logic (TypeScript mirror of backend/app/core/*).
 * Conforms to backend/app/core/domain.py. Semantic parity — not byte parity —
 * is required: same section detection, keyword normalization/matching,
 * coverage and score categories for identical inputs.
 */

export type SectionKey =
  | "experience" | "projects" | "education" | "skills"
  | "summary" | "certifications" | "languages";

export type MatchClass = "EXACT" | "ALIAS" | "NORMALIZED" | "RELATED" | "DERIVED" | "ABSENT";

export interface ParsedResume {
  raw_text: string;
  raw_ats_view: string;
  total_pages: number;
  is_multi_column: boolean;
  has_tables: boolean;
  contact_info: ContactInfo;
  sections: Partial<Record<SectionKey, string>>;
  formatting_issues: FormattingIssue[];
}

export interface ContactInfo {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
}

export interface FormattingIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  page?: number;
}

export interface KeywordSignal {
  keyword: string;
  tag: "REQUIRED" | "PREFERRED" | "CONTEXTUAL";
}

export interface KeywordMatch extends KeywordSignal {
  canonical: string;
  match_class: MatchClass;
  section: "experience" | "skills_only" | "raw_only" | "absent";
}

export interface Recommendation {
  category: string;
  priority: string;
  action: string;
}

export const SECTION_ALIASES: Record<SectionKey, string[]> = {
  experience: ["experience", "work experience", "professional experience", "employment", "employment history", "work history", "experiencia", "experiencia laboral", "experiencia profesional", "historial laboral", "trayectoria profesional"],
  projects: ["projects", "technical projects", "selected projects", "personal projects", "proyectos", "proyectos tecnicos", "proyectos destacados"],
  education: ["education", "academic background", "studies", "formacion", "formacion academica", "educacion", "estudios"],
  skills: ["skills", "technical skills", "competencies", "abilities", "habilidades", "habilidades tecnicas", "competencias", "conocimientos", "tecnologias"],
  summary: ["summary", "about me", "profile", "perfil", "extracto", "resumen", "perfil profesional", "professional summary"],
  certifications: ["certifications", "courses", "certificaciones", "cursos", "licencias", "licenses"],
  languages: ["languages", "idiomas"],
};

function normalizeHeader(line: string): string {
  return line
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();
}

const HEADER_INDEX = new Map<string, SectionKey>();
for (const [section, aliases] of Object.entries(SECTION_ALIASES) as [SectionKey, string[]][]) {
  for (const a of aliases) HEADER_INDEX.set(normalizeHeader(a), section);
}

export function detectSectionHeader(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 48) return null;
  if (trimmed.split(/\s+/).length > 4) return null;
  return HEADER_INDEX.get(normalizeHeader(trimmed)) ?? null;
}

export function extractSections(text: string): Partial<Record<SectionKey, string>> {
  const lines = text.split("\n");
  const hits: [number, SectionKey][] = [];
  lines.forEach((line, i) => {
    const s = detectSectionHeader(line);
    if (s) hits.push([i, s]);
  });
  const sections: Partial<Record<SectionKey, string>> = {};
  hits.forEach(([lineNo, name], idx) => {
    const end = idx + 1 < hits.length ? hits[idx + 1][0] : lines.length;
    const content = lines.slice(lineNo + 1, end).join("\n").trim();
    sections[name] = ((sections[name] ? sections[name] + "\n" : "") + content).trim();
  });
  return sections;
}

// --- keyword normalization (precision-first mirror of synonyms.py) --------
function normalizeToken(t: string): string {
  let s = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  s = s.replace(/react\.js/g, "reactjs").replace(/node\.js/g, "nodejs").replace(/next\.js/g, "nextjs");
  s = s.replace(/ci-cd/g, "ci/cd").replace(/restful apis?/g, "rest api").replace(/rest apis?/g, "rest api");
  return s.trim();
}

export const TECH_SYNONYMS: Record<string, string[]> = {
  kubernetes: ["kubernetes", "k8s", "kube"],
  postgresql: ["postgresql", "postgres", "psql"],
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  python: ["python", "py"],
  react: ["react", "reactjs"],
  node: ["node", "nodejs"],
  "ci/cd": ["ci/cd", "continuous integration", "continuous delivery"],
  rest: ["rest", "rest api", "api rest", "apis rest", "restful"],
  sql: ["sql"],
  mongodb: ["mongodb", "mongo"],
  "machine learning": ["machine learning", "ml"],
  dam: ["dam", "desarrollo de aplicaciones multiplataforma"],
  daw: ["daw", "desarrollo de aplicaciones web"],
  git: ["git", "control de versiones", "version control"],
  github: ["github"],
  gitlab: ["gitlab"],
  linux: ["linux", "ubuntu", "debian"],
  bash: ["bash"],
  docker: ["docker"],
  aws: ["aws", "amazon web services"],
};

const RELATED: Record<string, string[]> = {
  github: ["git"],
  gitlab: ["git"],
  "ci/cd": ["ci", "cd"],
  postgresql: ["sql", "mysql"],
};

const CANONICAL = new Map<string, string>();
for (const [c, aliases] of Object.entries(TECH_SYNONYMS)) {
  for (const a of aliases) CANONICAL.set(normalizeToken(a), c);
}

export function getCanonical(term: string): string {
  return CANONICAL.get(normalizeToken(term)) ?? normalizeToken(term);
}

function tokenPresent(syn: string, textNorm: string): boolean {
  const s = normalizeToken(syn);
  const t = normalizeToken(textNorm);
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (s.includes("/") || s.includes(" ")) {
    return new RegExp(`(?:^|[\\s.,;:()])${esc}(?:$|[\\s.,;:()])`).test(t);
  }
  return new RegExp(`(?<![a-z0-9_])${esc}(?![a-z0-9_])`).test(t);
}

export function classifyMatch(keyword: string, text: string): { matchClass: MatchClass; canonical: string } {
  const norm = (text ?? "").toLowerCase();
  const canonical = getCanonical(keyword);
  const kwNorm = normalizeToken(keyword);
  const aliases = TECH_SYNONYMS[canonical] ?? [keyword.toLowerCase()];
  if (tokenPresent(kwNorm, norm)) {
    return { matchClass: kwNorm === canonical ? "EXACT" : "ALIAS", canonical };
  }
  for (const syn of aliases) {
    if (tokenPresent(syn, norm)) return { matchClass: "ALIAS", canonical };
  }
  for (const rel of RELATED[canonical] ?? []) {
    if (tokenPresent(rel, norm)) return { matchClass: "RELATED", canonical };
  }
  return { matchClass: "ABSENT", canonical };
}

// --- contact extraction ----------------------------------------------------
export function extractContact(text: string): ContactInfo {  const email = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/)?.[0] ?? null;
  let phone: string | null = null;
  const candidates = text.match(/(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}/g) ?? [];
  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) { phone = c.trim(); break; }
  }
  const linkedin = text.match(/linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
  const github = text.match(/github\.com\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
  return { email, phone, linkedin, github };
}

export function toParsedResume(rawText: string): ParsedResume {
  return {
    raw_text: rawText,
    raw_ats_view: rawText.trim(),
    total_pages: 1,
    is_multi_column: false,
    has_tables: false,
    contact_info: extractContact(rawText),
    sections: extractSections(rawText),
    formatting_issues: [],
  };
}

// --- job keyword signals ----------------------------------------------------
const STOPWORDS = new Set(("de la el en y a los del se las por un para con no una su al lo como pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos esto mi antes algunos que unos yo otro otras otra tanto esa estos mucho quienes nada muchos cual poco ella estar estas algo " +
  "the and to of a in is that for it as was with on at by this be are from or have an they which one you were all there would their we him been has when who will more puesto empresa equipo jornada").split(" "));

const KEY_PHRASES = ["atencion al cliente", "trabajo en equipo", "spring boot", "machine learning", "integracion continua", "desarrollo de aplicaciones multiplataforma", "desarrollo de aplicaciones web", "pruebas unitarias", "control de versiones", "apis rest"];

export function extractJobSignals(jobText: string, maxKeywords = 14): KeywordSignal[] {
  const norm = (jobText ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const prefIdx = norm.search(/nice to have|preferred|plus|valorable|deseable|bonus/);
  const reqZone = prefIdx >= 0 ? norm.slice(0, prefIdx) : norm;
  const signals: KeywordSignal[] = [];
  const seen = new Set<string>();
  const tagFor = (p: string): KeywordSignal["tag"] => {
    if (prefIdx >= 0 && new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm.slice(prefIdx))) return "PREFERRED";
    if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(reqZone)) return "REQUIRED";
    return "CONTEXTUAL";
  };
  for (const phrase of KEY_PHRASES) {
    const pn = phrase.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (new RegExp(`\\b${pn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm) && !seen.has(phrase)) {
      seen.add(phrase);
      signals.push({ keyword: phrase, tag: tagFor(pn) });
    }
  }
  const freq = new Map<string, number>();
  for (const w of norm.match(/\b[a-z]{3,20}\b/g) ?? []) {
    if (STOPWORDS.has(w) || w.length <= 3) continue;
    if ([...seen].some((p) => p.includes(w))) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  for (const [w] of ranked.slice(0, Math.max(0, maxKeywords - signals.length))) {
    if (!seen.has(w)) { seen.add(w); signals.push({ keyword: w, tag: tagFor(w) }); }
  }
  return signals.slice(0, maxKeywords);
}

// --- audit scoring (mirrors backend weights; explainable, no fake floors) ---
const ACTION_VERBS = new Set(("led developed designed implemented built optimized automated delivered managed created launched scaled lideré diseñé desarrollé implementé optimicé automaticé gestioné coordiné transformé mejoré realicé supervisé").split(" "));

export interface AuditResult {
  overall_score: number;
  breakdown: { parseability: number; keyword_match: number; impact: number; format: number };
  weights: Record<string, number>;
  methodology_note: string;
  parse_details: Record<string, unknown>;
  keyword_details: Record<string, unknown>;
  impact_details: Record<string, unknown>;
  format_details: Record<string, unknown>;
  formatting_issues: FormattingIssue[];
  priority_recommendations: Recommendation[];
}

export function auditResume(parsed: ParsedResume, jobText = ""): AuditResult {
  const sections = parsed.sections ?? {};
  const contact = parsed.contact_info;
  // parseability
  let pScore = 100;
  const penalties: string[] = [];
  const missing = ["experience", "education", "skills"].filter((s) => !(s in sections));
  if (missing.length) { pScore -= missing.length * 15; penalties.push(`Missing key sections: ${missing.join(", ")}`); }
  if (parsed.is_multi_column) { pScore -= 25; penalties.push("Multi-column layout: may disrupt reading order in some parsers."); }
  if (parsed.has_tables) { pScore -= 15; penalties.push("Tables detected: may lose cell association."); }
  if (!contact.email) { pScore -= 30; penalties.push("Email missing or not machine-readable (-30)."); }
  if (!contact.phone) { pScore -= 10; penalties.push("Phone missing (-10)."); }
  pScore = Math.max(0, Math.min(100, pScore));

  // evidence / impact
  const lines = parsed.raw_text.split("\n").map((l) => l.trim()).filter((l) => l.length > 15);
  const bullets = lines.filter((l) => /^([-•*–—\d.]|\&bull\;)\s*/.test(l) || l.length > 25);
  let verbs = 0, metrics = 0;
  const weak: string[] = [];
  const metricRe = [/\b\d+([.,]\d+)?\s*%/, /[$€£¥]\s*\d+/, /\b\d+\s*(\+|k\b|m\b)/i, /\b(2x|3x|5x|10x)\b/];
  const outcomeRe = /(reduc|increm|improv|mejor|optim|ahorr|crec|eficiencia|precision)/i;
  for (const line of bullets) {
    const cleaned = line.replace(/^([-•*–—\d.]|\&bull\;)\s*/, "");
    const first = cleaned.toLowerCase().split(/\s+/).slice(0, 4);
    const hasAction = first.some((w) => ACTION_VERBS.has(w));
    const hasMetric = metricRe.some((r) => r.test(cleaned));
    if (hasAction) verbs++;
    if (hasMetric && (outcomeRe.test(cleaned) || /(%|[$€])/.test(cleaned))) metrics++;
    if (!hasAction && !hasMetric && weak.length < 5) weak.push(line);
  }
  const total = Math.max(1, bullets.length);
  const verbRatio = Math.min(1, verbs / Math.min(10, total));
  const metricRatio = Math.min(1, metrics / 5);
  const impact = Math.max(0, Math.min(100, Math.round(verbRatio * 50 + metricRatio * 50)));

  // format
  const words = parsed.raw_text.split(/\s+/).filter(Boolean).length;
  let fScore = 100;
  if (words < 250) fScore -= 20;
  else if (words > 1200) fScore -= 15;
  if (parsed.total_pages > 2) fScore -= (parsed.total_pages - 2) * 15;
  fScore = Math.max(0, Math.min(100, fScore));

  // keywords
  const signals = jobText.trim() ? extractJobSignals(jobText) : [];
  const matched: string[] = [], missingKw: string[] = [], inExp: string[] = [], inSkills: string[] = [];
  const details: KeywordMatch[] = [];
  let acc = 0, maxAcc = 0;
  const expText = `${sections.experience ?? ""} ${sections.projects ?? ""}`.toLowerCase();
  const skillsText = `${sections.skills ?? ""} ${sections.education ?? ""}`.toLowerCase();
  for (const s of signals) {
    const w = s.tag === "REQUIRED" ? 1 : s.tag === "PREFERRED" ? 0.7 : 0.5;
    maxAcc += w;
    const e = classifyMatch(s.keyword, expText);
    const k = classifyMatch(s.keyword, skillsText);
    const r = classifyMatch(s.keyword, parsed.raw_text);
    const strong = (m: MatchClass) => m === "EXACT" || m === "ALIAS" || m === "NORMALIZED";
    if (strong(e.matchClass)) { matched.push(s.keyword); inExp.push(s.keyword); acc += w; details.push({ ...s, canonical: e.canonical, match_class: e.matchClass, section: "experience" }); }
    else if (strong(k.matchClass) || strong(r.matchClass)) { matched.push(s.keyword); inSkills.push(s.keyword); acc += 0.8 * w; details.push({ ...s, canonical: k.canonical, match_class: k.matchClass !== "ABSENT" ? k.matchClass : r.matchClass, section: "skills_only" }); }
    else if (e.matchClass === "RELATED" || r.matchClass === "RELATED") { matched.push(s.keyword); inSkills.push(s.keyword); acc += 0.4 * w; details.push({ ...s, canonical: e.canonical, match_class: "RELATED", section: "raw_only" }); }
    else { missingKw.push(s.keyword); details.push({ ...s, canonical: e.canonical, match_class: "ABSENT", section: "absent" }); }
  }
  const kwScore = signals.length ? Math.round(Math.min(100, (acc / (maxAcc || 1)) * 100)) : 0;
  const coverage = signals.length ? Math.round((matched.length / signals.length) * 100) : 0;

  const hasJob = jobText.trim().length > 0;
  const weights: Record<string, number> = hasJob
    ? { keyword_match: 0.4, evidence: 0.25, parseability: 0.2, format: 0.15 }
    : { evidence: 0.4, parseability: 0.35, format: 0.25 };
  const overall = hasJob
    ? Math.round(kwScore * 0.4 + impact * 0.25 + pScore * 0.2 + fScore * 0.15)
    : Math.round(impact * 0.4 + pScore * 0.35 + fScore * 0.25);

  const recs: Recommendation[] = [];
  for (const issue of parsed.formatting_issues) {
    if (issue.severity === "high") recs.push({ category: "Estructura y parseabilidad", priority: "Alta", action: issue.message });
  }
  if (signals.length >= 4 && coverage < 35) {
    recs.push({ category: "Alineación con la oferta", priority: "Crítica", action: `Baja cobertura de requisitos (${coverage}%). Incorpora evidencia real solo donde exista: ${missingKw.slice(0, 6).join(", ")}. No inventes experiencia.` });
  } else if (missingKw.length) {
    recs.push({ category: "Palabras clave", priority: "Alta", action: `Incorpora estas keywords solo donde tengas experiencia real: ${missingKw.slice(0, 6).join(", ")}.` });
  }
  if (metrics < 3) recs.push({ category: "Evidencia de impacto", priority: "Media", action: "Añade resultados medibles donde existan. No inventes métricas." });
  if (weak.length) recs.push({ category: "Verbos de acción", priority: "Media", action: "Inicia cada viñeta con un verbo de acción concreto." });

  return {
    overall_score: Math.max(0, Math.min(100, overall)),
    breakdown: { parseability: pScore, keyword_match: kwScore, impact, format: fScore },
    weights,
    methodology_note: "Heuristic audit score (0-100 per category). Not a prediction of acceptance by any proprietary ATS product.",
    parse_details: { detected_sections: Object.keys(sections), missing_sections: missing, contact_found: contact, penalties, explanation: "Structural risks only; real parsers vary.", limitations: ["Heuristic; vendors differ."] },
    keyword_details: { total_extracted_keywords: signals.length, matched_keywords: matched, missing_keywords: missingKw, in_experience: inExp, in_skills_only: inSkills, coverage_pct: coverage, keywords: details },
    impact_details: { total_metrics_found: metrics, action_verbs_count: verbs, weak_bullets_examples: weak.slice(0, 3) },
    format_details: { word_count: words, pages: parsed.total_pages, ideal_word_count_range: "350 - 900 palabras" },
    formatting_issues: parsed.formatting_issues,
    priority_recommendations: recs.slice(0, 5),
  };
}

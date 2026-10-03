/**
 * Standalone (browser) ATS engine for GitHub Pages.
 * Canonical behaviour mirrors backend/app/core/* via ./domain.
 * Scores are heuristic audit signals, not predictions about proprietary ATS products.
 */
import {
  auditResume,
  extractContact,
  extractSections,
  type AuditResult,
  type ParsedResume,
} from "./domain";

export interface StandaloneResume {
  id: number;
  title: string;
  file_type: string;
  created_at: string;
  raw_text: string;
  parsed: ParsedResume & { full_name?: string; summary?: string; [k: string]: unknown };
  /** Origin marker: never confuse demo data with user data. */
  origin?: "demo" | "user" | "generated";
  engine?: "standalone";
}

/**
 * Synthetic DEMO fixtures only. Clearly fake names/addresses reserved for
 * examples; the app must label these as samples in the UI.
 */
export const STANDALONE_PROFILES: StandaloneResume[] = [
  {
    id: 11,
    title: "[DEMO] Backend Junior (synthetic sample)",
    file_type: "txt",
    created_at: "2026-01-01T00:00:00.000Z",
    origin: "demo",
    raw_text: [
      "Alex Demo",
      "alex.demo@example.com | +34 600 000 001",
      "",
      "PROFESSIONAL SUMMARY",
      "Junior backend developer (synthetic demo profile) with Java, Spring Boot and SQL training.",
      "",
      "WORK EXPERIENCE",
      "Backend intern | DemoLabs (2023)",
      "* Built REST endpoints with Spring Boot and PostgreSQL.",
      "",
      "EDUCATION",
      "Higher Technician in Multiplatform Application Development (demo)",
      "",
      "TECHNICAL SKILLS",
      "Java, Spring Boot, PostgreSQL, Git, Docker",
    ].join("\n"),
    parsed: {
      raw_text: "",
      raw_ats_view: "",
      total_pages: 1,
      is_multi_column: false,
      has_tables: false,
      contact_info: { email: "alex.demo@example.com", phone: "+34 600 000 001", linkedin: null, github: null },
      sections: {
        summary: "Junior backend developer (synthetic demo profile) with Java, Spring Boot and SQL training.",
        experience: "Backend intern | DemoLabs (2023)\n* Built REST endpoints with Spring Boot and PostgreSQL.",
        education: "Higher Technician in Multiplatform Application Development (demo)",
        skills: "Java, Spring Boot, PostgreSQL, Git, Docker",
      },
      formatting_issues: [],
      full_name: "Alex Demo",
      summary: "Junior backend developer (synthetic demo profile).",
    },
  },
  {
    id: 12,
    title: "[DEMO] Retail associate (synthetic sample)",
    file_type: "txt",
    created_at: "2026-01-01T00:00:00.000Z",
    origin: "demo",
    raw_text: [
      "Sam Demo",
      "sam.demo@example.com | +34 600 000 002",
      "",
      "PROFESSIONAL SUMMARY",
      "Retail associate (synthetic demo profile) focused on customer service and restocking.",
      "",
      "WORK EXPERIENCE",
      "Store associate | DemoMart (2022 - 2023)",
      "* Served customers at the counter and kept shelves stocked.",
      "",
      "EDUCATION",
      "Secondary education (demo)",
      "",
      "TECHNICAL SKILLS",
      "Customer service, restocking, cash register",
    ].join("\n"),
    parsed: {
      raw_text: "",
      raw_ats_view: "",
      total_pages: 1,
      is_multi_column: false,
      has_tables: false,
      contact_info: { email: "sam.demo@example.com", phone: "+34 600 000 002", linkedin: null, github: null },
      sections: {
        summary: "Retail associate (synthetic demo profile).",
        experience: "Store associate | DemoMart (2022 - 2023)\n* Served customers at the counter.",
        education: "Secondary education (demo)",
        skills: "Customer service, restocking, cash register",
      },
      formatting_issues: [],
      full_name: "Sam Demo",
      summary: "Retail associate (synthetic demo profile).",
    },
  },
];

export function toParsedResume(rawText: string): ParsedResume {
  const sections = extractSections(rawText);
  return {
    raw_text: rawText,
    raw_ats_view: rawText.trim(),
    total_pages: 1,
    is_multi_column: false,
    has_tables: false,
    contact_info: extractContact(rawText),
    sections,
    formatting_issues: [],
  };
}

export function standaloneAudit(resume: StandaloneResume, jobText: string): {
  result: AuditResult;
  raw_ats_view: string;
  untangled_view: string;
  engine: "standalone";
} {
  let parsed = resume.parsed as ParsedResume;
  if (!parsed || !parsed.raw_text) {
    parsed = toParsedResume(resume.raw_text);
  }
  const result = auditResume(parsed, jobText ?? "");
  return { result, raw_ats_view: parsed.raw_ats_view, untangled_view: parsed.raw_text, engine: "standalone" };
}

export function standaloneAutoFix(
  resume: StandaloneResume,
  jobText: string
): {
  new_resume_id: number;
  perfected_score: AuditResult;
  raw_ats_view: string;
  untangled_view: string;
  warnings: string[];
  perfectedResume: StandaloneResume;
} {
  const warnings: string[] = [];
  let parsed = resume.parsed as ParsedResume;
  if (!parsed || !parsed.raw_text) parsed = toParsedResume(resume.raw_text);

  const contact = parsed.contact_info ?? { email: null, phone: null, linkedin: null, github: null };
  if (!contact.email) warnings.push("Missing data: email address could not be recovered from the source document.");
  if (!contact.phone) warnings.push("Missing data: phone number could not be recovered from the source document.");

  const sections = parsed.sections ?? {};
  const lines = parsed.raw_text.split("\n").map((l) => l.trim()).filter(Boolean);
  let fullName = "Candidate Name Not Found In Source";
  for (const line of lines.slice(0, 4)) {
    if (/(@|http|\+?\d{6,})/i.test(line)) continue;
    if (line.split(/\s+/).length >= 2 && line.length < 45) { fullName = line; break; }
  }
  const clean = [
    fullName.toUpperCase(),
    [contact.email, contact.phone, contact.linkedin, contact.github].filter(Boolean).join(" | "),
    "--------------------------------------------------",
    "",
    "PROFESSIONAL SUMMARY",
    (sections.summary ?? "").trim() || "",
    "",
    "WORK EXPERIENCE",
    (sections.experience ?? "").trim(),
    "",
    "TECHNICAL SKILLS",
    (sections.skills ?? "").trim(),
    "",
    "EDUCATION",
    (sections.education ?? "").trim(),
  ].filter((l) => l !== "").join("\n");

  const fixedParsed = toParsedResume(clean);
  // Preserve source contact (never invent new values)
  fixedParsed.contact_info = contact;
  const audit = auditResume(
    { ...fixedParsed, raw_text: clean, raw_ats_view: clean },
    jobText ?? ""
  );
  const perfectedResume: StandaloneResume = {
    id: Date.now() % 1000000,
    title: `${fullName} (ATS-friendly format)`,
    file_type: "txt",
    created_at: new Date().toISOString(),
    raw_text: clean,
    parsed: { ...fixedParsed, full_name: fullName, summary: sections.summary as string | undefined },
    origin: "generated",
    engine: "standalone",
  };
  return {
    new_resume_id: perfectedResume.id,
    perfected_score: audit,
    raw_ats_view: clean,
    untangled_view: clean,
    warnings,
    perfectedResume,
  };
}

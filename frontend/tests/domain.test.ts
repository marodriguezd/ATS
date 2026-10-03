import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditResume,
  classifyMatch,
  detectSectionHeader,
  extractContact,
  extractSections,
  toParsedResume,
} from "../src/lib/domain";
import { standaloneAudit } from "../src/lib/standaloneEngine";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "shared", "fixtures", "ats_conformance.json"), "utf-8")
);

describe("cross-engine conformance fixture", () => {
  for (const c of fixture.cases as { id: string; keyword?: string; text?: string; expected_match?: string }[]) {
    if (!c.keyword) continue;
    it(c.id, () => {
      const { matchClass } = classifyMatch(c.keyword!, c.text!);
      if (c.expected_match === "ABSENT") expect(["ABSENT", "RELATED"]).toContain(matchClass);
      else expect(matchClass).toBe(c.expected_match);
    });
  }
});

describe("section parity", () => {
  it("projects vs experience stay disjoint", () => {
    const s = extractSections("WORK EXPERIENCE\nDid backend.\n\nPROJECTS\nDemo app.");
    expect(s.experience).toBeDefined();
    expect(s.projects).toContain("Demo");
    expect(s.experience).not.toContain("Demo");
  });
  it("bilingual accented headers", () => {
    expect(detectSectionHeader("FORMACIÓN ACADÉMICA")).toBe("education");
    expect(detectSectionHeader("Experiencia Laboral")).toBe("experience");
    expect(detectSectionHeader("Proyectos")).toBe("projects");
  });
});

describe("factuality", () => {
  it("missing contact stays missing with audit penalty, not fake data", () => {
    const parsed = toParsedResume("Alex Example\n\nWORK EXPERIENCE\nBuilt APIs.\n\nEDUCATION\nDAM.\n\nTECHNICAL SKILLS\nPython.");
    expect(parsed.contact_info.email).toBeNull();
    const audit = auditResume(parsed, "");
    expect(audit.breakdown.parseability).toBeLessThan(100);
    expect(JSON.stringify(audit)).not.toMatch(/miguadali|goldenmac/i);
  });
  it("standalone and domain audits agree", () => {
    const parsed = toParsedResume("Alex\nalex@example.com | +34 600 111 222\n\nWORK EXPERIENCE\nBuilt Python APIs.\n\nEDUCATION\nDAM.\n\nTECHNICAL SKILLS\nPython, SQL.");
    const resume = {
      id: 1, title: "t", file_type: "txt", created_at: "", raw_text: parsed.raw_text,
      parsed,
    } as unknown as import("../src/lib/standaloneEngine").StandaloneResume;
    const a = standaloneAudit(resume, "We require Python and SQL.").result;
    const b = auditResume(resume.parsed, "We require Python and SQL.");
    expect(a.overall_score).toBe(b.overall_score);
    expect(a.breakdown).toEqual(b.breakdown);
  });
  it("contact extraction ignores years", () => {
    expect(extractContact("DAM (2021 - 2023)").phone).toBeNull();
  });
});

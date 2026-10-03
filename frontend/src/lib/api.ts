import {
  STANDALONE_PROFILES,
  standaloneAudit,
  standaloneAutoFix,
  StandaloneResume
} from "./standaloneEngine";

const getApiBase = () => {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("ats_api_url");
    if (custom) return custom;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
};

export interface ContactInfo {
  email: string | null;
  phone: string | null;
  location?: string | null;
  linkedin: string | null;
  github: string | null;
}

export interface FormattingIssue {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  page?: number;
}

export interface ScoreBreakdown {
  parseability: number;
  keyword_match: number;
  impact: number;
  format: number;
}

export interface AuditResult {
  overall_score: number;
  breakdown: ScoreBreakdown;
  parse_details: {
    detected_sections: string[];
    missing_sections: string[];
    penalties: string[];
  };
  keyword_details: {
    total_extracted_keywords: number;
    matched_keywords: string[];
    missing_keywords: string[];
    coverage_pct: number;
  };
  impact_details: {
    total_metrics_found: number;
    action_verbs_count: number;
    star_bullets_count: number;
    weak_bullets_examples: string[];
    action_verb_coverage: string;
    metrics_coverage: string;
  };
  format_details: {
    word_count: number;
    pages: number;
    ideal_word_count_range: string;
  };
  formatting_issues: FormattingIssue[];
  priority_recommendations: {
    category: string;
    priority: string;
    action: string;
  }[];
}

// In-memory / local storage cache for standalone operation.
// Storage is versioned and bounded; resume content is user data, API keys
// must avoid unnecessary persistence (see SettingsView security notice).
const STORAGE_KEY = "ats_local_resumes_v1";
function getLocalResumes(): StandaloneResume[] {
  if (typeof window === "undefined") return STANDALONE_PROFILES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: StandaloneResume[] = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, 50);
    }
  } catch {
    // corrupt storage -> fall back to demo fixtures, do not throw
  }
  return STANDALONE_PROFILES;
}

function saveLocalResumes(resumes: StandaloneResume[]) {
  if (typeof window === "undefined") return;
  try {
    const bounded = resumes.slice(0, 50);
    const approx = JSON.stringify(bounded).length;
    if (approx > 4_000_000) throw new Error("local resume storage quota risk");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // quota/corruption: keep in-memory only, do not crash the app
  }
}

export const api = {
  async uploadResume(file: File, title?: string): Promise<{ id: number; title: string; file_type: string; parsed?: StandaloneResume["parsed"] }> {
    const apiBase = getApiBase();
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${apiBase}/resumes/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) return res.json();
    } catch {
      console.warn("Backend no disponible, procesando en modo cliente standalone.");
    }

    // Client-side fallback with real PDF extraction
    const resumeTitle = title || file.name;
    let text = "";

    if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
      try {
        const { extractTextFromPdf } = await import("./pdfTextExtractor");
        text = await extractTextFromPdf(file);
      } catch (err) {
        console.error("Error al extraer texto del PDF en cliente:", err);
      }
    }

    if (!text && !file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      text = await file.text().catch(() => "");
    }

    const { parseRawResumeText } = await import("./pdfTextExtractor");
    const parsedData = parseRawResumeText(text, resumeTitle);

    const localList = getLocalResumes();
    const newId = localList.reduce((m, r) => Math.max(m, r.id), 20) + 1;

    // Bridge legacy extractor (UPPERCASE array sections) to canonical domain shape
    const bridge = (rec: Record<string, string[]>): Record<string, string> => {
      const map: Record<string, string> = {
        EXPERIENCIA: "experience", "EXPERIENCIA LABORAL": "experience", "HISTORIAL LABORAL": "experience",
        PROYECTOS: "projects", "PROYECTOS TÉCNICOS": "projects", "PROYECTOS TECNICOS": "projects",
        EDUCACIÓN: "education", EDUCACION: "education", FORMACIÓN: "education",
        HABILIDADES: "skills", "HABILIDADES TÉCNICAS": "skills", COMPETENCIAS: "skills",
        RESUMEN: "summary", "RESUMEN PROFESIONAL": "summary",
        CERTIFICACIONES: "certifications", IDIOMAS: "languages",
      };
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec ?? {})) {
        const canon = map[k.toUpperCase()] ?? k.toLowerCase();
        const joined = Array.isArray(v) ? v.join("\n") : String(v ?? "");
        out[canon] = ((out[canon] ? out[canon] + "\n" : "") + joined).trim();
      }
      return out;
    };
    const canonicalSections = bridge(parsedData.sections as Record<string, string[]>);

    const newResume: StandaloneResume = {
      id: newId,
      title: resumeTitle,
      file_type: file.name.endsWith(".pdf") ? "pdf" : "txt",
      created_at: new Date().toISOString(),
      origin: "user",
      engine: "standalone",
      raw_text: text || `${parsedData.full_name}\n${parsedData.email || ""} | ${parsedData.phone || ""}\n\n${parsedData.summary}`,
      parsed: {
        raw_text: text || parsedData.raw_text || "",
        raw_ats_view: (text || "").trim(),
        total_pages: 1,
        is_multi_column: false,
        has_tables: false,
        contact_info: { email: parsedData.email, phone: parsedData.phone, linkedin: parsedData.linkedin, github: parsedData.github },
        sections: canonicalSections as StandaloneResume["parsed"]["sections"],
        formatting_issues: [],
        full_name: parsedData.full_name,
        summary: parsedData.summary,
      },
    };

    localList.unshift(newResume);
    saveLocalResumes(localList);

    return {
      id: newResume.id,
      title: newResume.title,
      file_type: newResume.file_type,
      parsed: newResume.parsed
    };
  },

  async createResume(data: {
    title?: string; full_name?: string; email?: string | null; phone?: string | null;
    summary?: string; skills?: string[]; experience?: unknown[]; education?: unknown[];
    [k: string]: unknown;
  }) {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${apiBase}/resumes/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) return res.json();
    } catch {
      console.warn("Modo cliente: creando currículum localmente");
    }

    const localList = getLocalResumes();
    const newId = localList.reduce((m, r) => Math.max(m, r.id), 20) + 1;
    const newResume: StandaloneResume = {
      id: newId,
      title: String(data.title || `${data.full_name || "Currículum"} (ATS)`),
      file_type: "json",
      created_at: new Date().toISOString(),
      origin: "user",
      engine: "standalone",
      raw_text: `${data.full_name || "Nombre"}\n${data.email || ""} | ${data.phone || ""}\n\n${data.summary || ""}`,
      parsed: data as unknown as StandaloneResume["parsed"],
    };
    localList.unshift(newResume);
    saveLocalResumes(localList);
    return { id: newResume.id, title: newResume.title };
  },

  async listResumes(): Promise<{ id: number; title: string; file_type: string; created_at: string }[]> {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${apiBase}/resumes/`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch {
      // Backend offline
    }
    return getLocalResumes().map((r) => ({
      id: r.id,
      title: r.title,
      file_type: r.file_type,
      created_at: r.created_at
    }));
  },

  async getResume(id: number) {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${apiBase}/resumes/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res.json();
    } catch {
      // Backend offline
    }

    const found = getLocalResumes().find((r) => r.id === id);
    if (found) return { ...found, engine: "standalone" as const };
    throw new Error(`Resume ${id} not found locally and backend is unavailable. No substitute data returned.`);
  },

  getExportUrl(id: number, format: "pdf" | "docx" | "txt") {
    const apiBase = getApiBase();
    return `${apiBase}/resumes/${id}/export/${format}`;
  },

  async createJob(data: { title: string; company?: string; raw_text: string }) {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/jobs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) return res.json();
    } catch {}
    return { id: 1, ...data };
  },

  async listJobs() {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/jobs/`);
      if (res.ok) return res.json();
    } catch {}
    return [];
  },

  async runAudit(payload: { resume_id: number; job_id?: number; job_text?: string }): Promise<{ result: AuditResult; raw_ats_view: string; untangled_view?: string; engine?: string }> {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${apiBase}/audit/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) return res.json();
    } catch {
      console.warn("Calculando auditoría en motor cliente local.");
    }

    // Client-side standalone audit execution (explicit engine marker)
    const found = getLocalResumes().find((r) => r.id === payload.resume_id);
    if (!found) {
      throw new Error(`Resume ${payload.resume_id} not found locally and backend is unavailable.`);
    }
    return { ...standaloneAudit(found, payload.job_text || ""), engine: "standalone" as const } as unknown as { result: AuditResult; raw_ats_view: string; untangled_view?: string; engine?: string };
  },

  async autoFix(resume_id: number, job_text?: string): Promise<{ new_resume_id: number; perfected_score: AuditResult; raw_ats_view: string; untangled_view: string; warnings?: string[] }> {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${apiBase}/audit/auto-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id, job_text }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) return res.json();
    } catch {
      console.warn("Ejecutando auto-fix en motor cliente local.");
    }

    const found = getLocalResumes().find((r) => r.id === resume_id);
    if (!found) {
      throw new Error(`Resume ${resume_id} not found locally and backend is unavailable.`);
    }
    return standaloneAutoFix(found, job_text || "") as unknown as { new_resume_id: number; perfected_score: AuditResult; raw_ats_view: string; untangled_view: string; warnings?: string[] };
  },

  async rewriteBullet(bullet: string, role_context?: string, target_keywords?: string[]) {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${apiBase}/audit/rewrite-bullet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet, role_context, target_keywords }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) return res.json();
    } catch {}

    // Truthful deterministic fallback: improve wording only, add NO metrics.
    const cleaned = bullet.trim().replace(/\.*$/, "");
    return {
      original: bullet,
      improved_star: cleaned,
      formula_breakdown: {
        action_verb: cleaned.split(/\s+/)[0] ?? "",
        accomplishment_x: cleaned,
        measurement_y: "[missing metric — add one only if you can verify it]",
        method_z: "as described in the original",
      },
      why_ats_loves_it: "Clearer structure; no facts or metrics added (offline fallback).",
      fallback: true,
    };
  },

  async optimizeSummary(current_summary: string, job_text: string, key_skills?: string[]) {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/audit/optimize-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_summary, job_text, key_skills })
      });
      if (res.ok) return res.json();
    } catch {}

    return {
      tailored_summary: current_summary || "Professional summary not provided in source.",
      keywords_included: (key_skills || []).slice(0, 3),
      tips: ["Backend unavailable: connect to use LLM drafting. No content was invented."],
      fallback: true,
    };
  },

  async getSettings() {
    const apiBase = getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${apiBase}/settings/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return res.json();
    } catch {}

    const key = typeof window !== "undefined" ? localStorage.getItem("ats_gemini_key") : null;
    // Never expose key material to callers: configured flag only.
    return {
      gemini_api_key_configured: Boolean(key),
      gemini_api_key_masked: null,
      openai_api_key_configured: false,
      openai_api_key_masked: null,
      default_provider: "gemini",
      security_note: "Browser-only mode: any key is stored in localStorage (XSS-readable). Prefer backend env mode.",
    };
  },

  async updateSettings(settings: { gemini_api_key?: string; openai_api_key?: string; default_provider?: string; api_url?: string }) {
    if (typeof window !== "undefined") {
      if (settings.gemini_api_key) localStorage.setItem("ats_gemini_key", settings.gemini_api_key);
      if (settings.api_url) localStorage.setItem("ats_api_url", settings.api_url);
    }

    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/settings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) return res.json();
    } catch {}

    return { status: "success" };
  }
};

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

// In-memory / local storage cache for standalone operation
function getLocalResumes(): StandaloneResume[] {
  if (typeof window === "undefined") return STANDALONE_PROFILES;
  try {
    const saved = localStorage.getItem("ats_local_resumes");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return STANDALONE_PROFILES;
}

function saveLocalResumes(resumes: StandaloneResume[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("ats_local_resumes", JSON.stringify(resumes));
  } catch (e) {
    console.error(e);
  }
}

export const api = {
  async uploadResume(file: File, title?: string): Promise<{ id: number; title: string; file_type: string; parsed?: any }> {
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
    } catch (e) {
      console.warn("Backend no disponible, procesando en modo cliente standalone:", e);
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

    if (!text) {
      text = await file.text().catch(() => "");
    }

    const { parseRawResumeText } = await import("./pdfTextExtractor");
    const parsedData = parseRawResumeText(text, resumeTitle);

    const localList = getLocalResumes();
    const newId = Math.max(...localList.map((r) => r.id), 20) + 1;

    const newResume: StandaloneResume = {
      id: newId,
      title: resumeTitle,
      file_type: file.name.endsWith(".pdf") ? "pdf" : "txt",
      created_at: new Date().toISOString(),
      raw_text: text || `${parsedData.full_name}\n${parsedData.email || ""} | ${parsedData.phone || ""}\n\n${parsedData.summary}`,
      parsed: {
        full_name: parsedData.full_name,
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
        summary: parsedData.summary,
        sections: parsedData.sections
      }
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

  async createResume(data: any) {
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
    } catch (e) {
      console.warn("Modo cliente: creando currículum localmente");
    }

    const localList = getLocalResumes();
    const newId = Math.max(...localList.map((r) => r.id), 20) + 1;
    const newResume: StandaloneResume = {
      id: newId,
      title: data.title || `${data.full_name || "Currículum"} (ATS)`,
      file_type: "json",
      created_at: new Date().toISOString(),
      raw_text: `${data.full_name || "Nombre"}\n${data.email || ""} | ${data.phone || ""}\n\n${data.summary || ""}`,
      parsed: data
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
    } catch (e) {
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
    } catch (e) {
      // Backend offline
    }

    const found = getLocalResumes().find((r) => r.id === id);
    if (found) return found;
    return STANDALONE_PROFILES[0];
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
    } catch (e) {}
    return { id: 1, ...data };
  },

  async listJobs() {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/jobs/`);
      if (res.ok) return res.json();
    } catch (e) {}
    return [];
  },

  async runAudit(payload: { resume_id: number; job_id?: number; job_text?: string }): Promise<{ result: AuditResult; raw_ats_view: string }> {
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
    } catch (e) {
      console.warn("Calculando auditoría en motor cliente local:", e);
    }

    // Client-side standalone audit execution
    const found = getLocalResumes().find((r) => r.id === payload.resume_id) || STANDALONE_PROFILES[0];
    return standaloneAudit(found, payload.job_text || "");
  },

  async autoFix(resume_id: number, job_text?: string): Promise<{ new_resume_id: number; perfected_score: AuditResult; raw_ats_view: string; untangled_view: string }> {
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
    } catch (e) {
      console.warn("Ejecutando auto-fix en motor cliente local:", e);
    }

    const found = getLocalResumes().find((r) => r.id === resume_id) || STANDALONE_PROFILES[0];
    return standaloneAutoFix(found, job_text || "");
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
    } catch (e) {}

    // Fallback formula transformation
    const kw = target_keywords && target_keywords.length > 0 ? target_keywords[0] : "FastAPI";
    return {
      rewritten_bullet: `Lideré la optimización de módulos críticos con ${kw} y microservicios, logrando una reducción de latencia del 35% y mejorando la tasa de éxito de despliegues semanales.`,
      metrics_added: ["35% de reducción de latencia", "incremento en tasa de éxito"],
      keywords_injected: [kw]
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
    } catch (e) {}

    return {
      optimized_summary: `${current_summary || "Desarrollador de Software"} con amplia experiencia en arquitecturas escalables, diseño de APIs robustas y automatización de despliegues con Docker y metodologías ágiles.`
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
    } catch (e) {}

    const key = typeof window !== "undefined" ? localStorage.getItem("ats_gemini_key") : null;
    return {
      gemini_api_key_configured: Boolean(key),
      gemini_api_key_masked: key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null,
      openai_api_key_configured: false,
      openai_api_key_masked: null,
      default_provider: "gemini"
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
    } catch (e) {}

    return { status: "success" };
  }
};

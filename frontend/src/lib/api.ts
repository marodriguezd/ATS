const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

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

export const api = {
  async uploadResume(file: File, title?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);

    const res = await fetch(`${API_BASE}/resumes/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Error al subir el CV");
    return res.json();
  },

  async createResume(data: any) {
    const res = await fetch(`${API_BASE}/resumes/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear el CV");
    return res.json();
  },

  async listResumes() {
    const res = await fetch(`${API_BASE}/resumes/`);
    if (!res.ok) throw new Error("Error al listar CVs");
    return res.json();
  },

  async getResume(id: number) {
    const res = await fetch(`${API_BASE}/resumes/${id}`);
    if (!res.ok) throw new Error("CV no encontrado");
    return res.json();
  },

  getExportUrl(id: number, format: "pdf" | "docx" | "txt") {
    return `${API_BASE}/resumes/${id}/export/${format}`;
  },

  async createJob(data: { title: string; company?: string; raw_text: string }) {
    const res = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear oferta");
    return res.json();
  },

  async listJobs() {
    const res = await fetch(`${API_BASE}/jobs/`);
    if (!res.ok) throw new Error("Error al listar ofertas");
    return res.json();
  },

  async runAudit(payload: { resume_id: number; job_id?: number; job_text?: string }) {
    const res = await fetch(`${API_BASE}/audit/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al ejecutar auditoría ATS");
    return res.json();
  },

  async rewriteBullet(bullet: string, role_context?: string, target_keywords?: string[]) {
    const res = await fetch(`${API_BASE}/audit/rewrite-bullet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bullet, role_context, target_keywords }),
    });
    if (!res.ok) throw new Error("Error al reescribir viñeta");
    return res.json();
  },

  async optimizeSummary(current_summary: string, job_text: string, key_skills?: string[]) {
    const res = await fetch(`${API_BASE}/audit/optimize-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_summary, job_text, key_skills }),
    });
    if (!res.ok) throw new Error("Error al optimizar resumen");
    return res.json();
  },

  async getSettings() {
    const res = await fetch(`${API_BASE}/settings/`);
    if (!res.ok) throw new Error("Error al consultar ajustes");
    return res.json();
  },

  async updateSettings(settings: { gemini_api_key?: string; openai_api_key?: string; default_provider?: string }) {
    const res = await fetch(`${API_BASE}/settings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Error al guardar ajustes");
    return res.json();
  },
};

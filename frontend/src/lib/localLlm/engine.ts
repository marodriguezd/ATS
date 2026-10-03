/**
 * Browser-local LLM engine (WebGPU via WebLLM, CPU/WASM fallback notice).
 *
 * - Lazy: the ~1GB model downloads only when the user enables "Local".
 * - Private: inference stays on-device, no API key.
 * - Safe: outputs go through the same factuality validators as the backend.
 */
import { getLocalModel } from "./registry";
import { extractJsonObject, introducesHallucinatedMetric } from "./prompts";

// WebLLM is an optional runtime dependency loaded dynamically so SSR,
// vitest and static export never break when WebGPU is unavailable.
type WebLLMEngine = {
  reload: (modelId: string) => Promise<void>;
  chat: {
    completions: {
      create: (req: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<{ choices: { message?: { content?: string } }[] }>;
    };
  };
  setInitProgressCallback?: (cb: (p: { progress: number; text: string }) => void) => void;
};

let enginePromise: Promise<WebLLMEngine | null> | null = null;
let loadedModelId: string | null = null;
let progressCb: ((pct: number, text: string) => void) | null = null;

export function onLocalLlmProgress(cb: (pct: number, text: string) => void) {
  progressCb = cb;
}

export function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function getLoadedLocalModelId(): string | null {
  return loadedModelId;
}

async function createEngine(): Promise<WebLLMEngine | null> {
  try {
    const mod = await import("@mlc-ai/web-llm").catch(() => null);
    if (!mod) return null;
    const factory =
      (mod as { CreateMLCEngine?: (...a: unknown[]) => Promise<WebLLMEngine> }).CreateMLCEngine ??
      (mod as { CreateWebWorkerMLCEngine?: (...a: unknown[]) => Promise<WebLLMEngine> })
        .CreateWebWorkerMLCEngine;
    if (typeof factory !== "function") return null;
    const engine: WebLLMEngine = await factory(undefined, undefined, undefined);
    return engine;
  } catch {
    return null;
  }
}

export async function ensureLocalModel(modelId?: string): Promise<{
  ok: boolean;
  engine?: WebLLMEngine;
  reason?: string;
}> {
  const card = getLocalModel(modelId);
  if (typeof window === "undefined") return { ok: false, reason: "SSR: local LLM needs a browser." };
  if (!hasWebGPU()) {
    return {
      ok: false,
      reason:
        "WebGPU no disponible en este navegador. Usa Chrome/Edge 113+ con GPU, o el motor heuristic/Gemini del backend.",
    };
  }
  if (enginePromise && loadedModelId === card.webllmId) {
    const e = await enginePromise;
    return e ? { ok: true, engine: e } : { ok: false, reason: "Motor WebLLM no cargado." };
  }
  if (!enginePromise) {
    enginePromise = createEngine();
  }
  const engine = await enginePromise;
  if (!engine) {
    enginePromise = null;
    return { ok: false, reason: "No se pudo inicializar @mlc-ai/web-llm. Revisa la instalación." };
  }
  try {
    engine.setInitProgressCallback?.((p) => progressCb?.(Math.round(p.progress * 100), p.text));
    await engine.reload(card.webllmId);
    loadedModelId = card.webllmId;
    progressCb?.(100, "Modelo local listo");
    return { ok: true, engine };
  } catch (e) {
    enginePromise = null;
    loadedModelId = null;
    return { ok: false, reason: `Descarga/carga falló (${(e as Error)?.message ?? "error"}). Prueba el modelo ligero.` };
  }
}

async function complete(prompt: string, modelId?: string, maxTokens = 512): Promise<string | null> {
  const { ok, engine } = await ensureLocalModel(modelId);
  if (!ok || !engine) return null;
  try {
    const res = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: maxTokens,
    });
    return res.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export function localFallbackBullet(bullet: string, targetKeywords: string[] = []) {
  const cleaned = (bullet || "").trim().replace(/\.+$/, "");
  let kwPhrase = "";
  for (const kw of targetKeywords) {
    if (kw.toLowerCase() && cleaned.toLowerCase().includes(kw.toLowerCase())) {
      kwPhrase = ` using ${kw}`;
      break;
    }
  }
  let improved = `${cleaned}${kwPhrase}.`;
  if (
    !/^(Led|Built|Designed|Implemented|Developed|Optimized|Automated|Lideré|Diseñé|Desarrollé|Implementé|Automaticé|Optimizé|Gestioné|Coordiné)\b/.test(
      improved
    )
  ) {
    improved = improved ? `Delivered ${improved[0].toLowerCase()}${improved.slice(1)}` : "No source bullet provided.";
  }
  return {
    original: bullet,
    improved_star: improved,
    formula_breakdown: {
      action_verb: improved.split(" ")[0] ?? "",
      accomplishment_x: cleaned,
      measurement_y: "[missing metric — add one only if you can verify it]",
      method_z: kwPhrase.trim() || "as described in the original",
    },
    why_ats_loves_it: "Clearer verb and structure; no facts or metrics added (local fallback).",
    fallback: true,
    engine: "local-fallback",
  };
}

export async function localRewriteBullet(
  prompt: string,
  originalBullet: string,
  targetKeywords: string[] = [],
  modelId?: string
) {
  const text = await complete(prompt, modelId);
  if (!text) return { ...localFallbackBullet(originalBullet, targetKeywords), localAttempted: true };
  const parsed = extractJsonObject(text) as Record<string, unknown> | null;
  if (!parsed || typeof parsed["improved_star"] !== "string" || !parsed["formula_breakdown"]) {
    return { ...localFallbackBullet(originalBullet, targetKeywords), localAttempted: true };
  }
  if (introducesHallucinatedMetric(originalBullet, String(parsed["improved_star"]))) {
    return { ...localFallbackBullet(originalBullet, targetKeywords), localAttempted: true };
  }
  return {
    original: originalBullet,
    improved_star: String(parsed["improved_star"]),
    formula_breakdown: parsed["formula_breakdown"],
    why_ats_loves_it: String(parsed["why_ats_loves_it"] ?? "Clearer structure from the on-device model."),
    engine: "local-webgpu",
    model: getLocalModel(modelId).id,
  };
}

export async function localOptimizeSummary(
  prompt: string,
  currentSummary: string,
  keySkills: string[] = [],
  modelId?: string
) {
  const text = await complete(prompt, modelId, 640);
  if (!text) {
    return {
      tailored_summary: currentSummary || "Professional summary not provided in source.",
      keywords_included: keySkills.slice(0, 3),
      tips: ["Local model unavailable: heuristic fallback used. No content was invented."],
      fallback: true,
      engine: "local-fallback",
    };
  }
  const parsed = extractJsonObject(text) as Record<string, unknown> | null;
  if (!parsed || typeof parsed["tailored_summary"] !== "string") {
    return {
      tailored_summary: currentSummary || "Professional summary not provided in source.",
      keywords_included: keySkills.slice(0, 3),
      tips: ["Local model returned invalid JSON: heuristic fallback used."],
      fallback: true,
      engine: "local-fallback",
    };
  }
  return {
    tailored_summary: String(parsed["tailored_summary"]),
    keywords_included: Array.isArray(parsed["keywords_included"])
      ? (parsed["keywords_included"] as unknown[]).map(String)
      : keySkills.slice(0, 3),
    tips: Array.isArray(parsed["tips"]) ? (parsed["tips"] as unknown[]).map(String) : [],
    engine: "local-webgpu",
    model: getLocalModel(modelId).id,
  };
}

export async function localChat(prompt: string, modelId?: string): Promise<{
  text: string;
  engine: string;
  fallback: boolean;
}> {
  const text = await complete(prompt, modelId, 640);
  if (!text) {
    return {
      text: "Modelo local no disponible (sin WebGPU o sin descargar). Activa el modelo ligero o usa el backend.",
      engine: "local-fallback",
      fallback: true,
    };
  }
  return { text: text.trim().slice(0, 3000), engine: "local-webgpu", fallback: false };
}

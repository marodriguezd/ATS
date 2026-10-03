import React, { useState } from "react";
import { Bot, Send, Loader2, ShieldCheck } from "lucide-react";
import { api, AuditResult } from "@/lib/api";
import { getLoadedLocalModelId, hasWebGPU, onLocalLlmProgress } from "@/lib/localLlm/engine";
import { getLocalModel } from "@/lib/localLlm/registry";

interface AssistantViewProps {
  resumeText?: string;
  jobText?: string;
  auditResult?: AuditResult | null;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  engine?: string;
}

const SUGGESTIONS = [
  "¿Qué 3 mejoras priorizo para superar el 80%?",
  "¿Qué keywords de la oferta me faltan y dónde ponerlas?",
  "Reescribe mi resumen en 3 líneas sin inventar datos",
];

export const AssistantView: React.FC<AssistantViewProps> = ({ resumeText = "", jobText = "", auditResult = null }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const webgpu = typeof window !== "undefined" && hasWebGPU();
  const loadedId = typeof window !== "undefined" ? getLoadedLocalModelId() : null;

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    try {
      onLocalLlmProgress((pct, text) => setProgress(`${pct}% · ${text}`));
      const auditSummary = auditResult
        ? `overall ${auditResult.overall_score}, breakdown ${JSON.stringify(auditResult.breakdown)}, ` +
          `missing keywords: ${(auditResult.keyword_details.missing_keywords ?? []).slice(0, 10).join(", ")}, ` +
          `weak bullets: ${(auditResult.impact_details.weak_bullets_examples ?? []).slice(0, 3).join(" | ")}`
        : "";
      const res = await api.askAssistant(question, {
        resumeText,
        jobText,
        auditSummary,
        provider: "local",
      });
      setMessages((m) => [...m, { role: "assistant", text: res.answer, engine: res.engine }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Error al consultar el modelo local.", engine: "error" }]);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <span>Asistente IA local</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {getLocalModel(
              typeof window !== "undefined" ? localStorage.getItem("ats_local_model_id") : null
            ).name}{" "}
            · en tu dispositivo · no inventa datos
            {loadedId ? " · cargado" : ""}
            {!webgpu && " · sin WebGPU (descarga el modelo o usa backend)"}
            {progress && ` · ${progress}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={busy}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            Pregunta lo que sea sobre tu CV y la oferta: mejoras, keywords, resumen, explicación del score.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-xs p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
              m.role === "user" ? "bg-emerald-600 text-white ml-8" : "bg-slate-50 border border-slate-200 text-slate-800 mr-8"
            }`}
          >
            {m.text}
            {m.role === "assistant" && m.engine && (
              <div className="text-[10px] text-slate-400 mt-1">motor: {m.engine}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generando en tu dispositivo… (primera vez descarga ~1.1GB)</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center space-x-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="flex-1 text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-start space-x-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          Privado: el modelo corre en tu navegador (WebGPU) o CPU. Sin API keys, sin envíos a servidores. Si el
          dispositivo no puede, usa el fallback heuristic del backend.
        </span>
      </div>
    </div>
  );
};

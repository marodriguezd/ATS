import React, { useState } from "react";
import { Sparkles, ArrowRight, Copy, Check, Wand2, Lightbulb, Target } from "lucide-react";
import { api } from "@/lib/api";

interface StarOptimizerProps {
  weakBullets?: string[];
  missingKeywords?: string[];
  jobDescription?: string;
  currentSummary?: string;
}

export const StarOptimizer: React.FC<StarOptimizerProps> = ({
  weakBullets = [],
  missingKeywords = [],
  jobDescription = "",
  currentSummary = "",
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"bullets" | "summary">("bullets");

  // Bullet state
  const [selectedBullet, setSelectedBullet] = useState(weakBullets[0] || "");
  const [roleContext, setRoleContext] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<any>(null);
  const [bulletCopied, setBulletCopied] = useState(false);

  // Summary state
  const [summaryInput, setSummaryInput] = useState(currentSummary);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [summaryCopied, setSummaryCopied] = useState(false);

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleRewrite = async () => {
    if (!selectedBullet.trim()) return;
    setIsRewriting(true);
    setRewriteResult(null);
    try {
      const res = await api.rewriteBullet(selectedBullet, roleContext, selectedKeywords);
      setRewriteResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleOptimizeSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryResult(null);
    try {
      const res = await api.optimizeSummary(summaryInput, jobDescription, missingKeywords);
      setSummaryResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Optimizador de Impacto (Fórmula Google XYZ / STAR)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Convierte tareas pasivas en viñetas de alto rendimiento con impacto cuantificado y keywords.
          </p>
        </div>

        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab("bullets")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "bullets"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Viñetas Laborales
          </button>
          <button
            onClick={() => setActiveSubTab("summary")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "summary"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Perfil / Summary
          </button>
        </div>
      </div>

      {activeSubTab === "bullets" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input & setup */}
          <div className="space-y-4">
            {weakBullets.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Viñetas detectadas en tu CV con oportunidad de mejora:
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {weakBullets.map((wb, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedBullet(wb)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
                        selectedBullet === wb
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-medium"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      "{wb}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                Viñeta a transformar:
              </label>
              <textarea
                value={selectedBullet}
                onChange={(e) => setSelectedBullet(e.target.value)}
                placeholder="Ejemplo: Responsable del desarrollo de la API backend y corrección de bugs..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
                Contexto del rol (opcional):
              </label>
              <input
                type="text"
                value={roleContext}
                onChange={(e) => setRoleContext(e.target.value)}
                placeholder="Ej. Senior Backend Developer en startup fintech"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {missingKeywords.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-rose-500" />
                  <span>Inyectar palabras clave faltantes de la oferta:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {missingKeywords.slice(0, 8).map((kw, idx) => {
                    const isSelected = selectedKeywords.includes(kw);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleKeyword(kw)}
                        className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white font-semibold"
                            : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        + {kw}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleRewrite}
              disabled={isRewriting || !selectedBullet.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
            >
              {isRewriting ? (
                <span>Analizando y optimizando...</span>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generar versión STAR / XYZ</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Output */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            {rewriteResult ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase text-emerald-800 tracking-wide flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Viñeta Optimizada para ATS:</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(rewriteResult.improved_star, setBulletCopied)}
                      className="flex items-center space-x-1 text-xs text-slate-600 hover:text-emerald-700 bg-white px-2 py-1 rounded-md border border-slate-200"
                    >
                      {bulletCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-slate-800 text-xs font-medium leading-relaxed shadow-2xs">
                    • {rewriteResult.improved_star}
                  </div>
                </div>

                {rewriteResult.formula_breakdown && (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                      Desglose de la Fórmula Google:
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                      <div className="text-slate-600">
                        <b className="text-slate-900">Verbo de acción:</b>{" "}
                        <span className="text-emerald-700 font-semibold">
                          {rewriteResult.formula_breakdown.action_verb}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <b className="text-slate-900">Logro [X]:</b>{" "}
                        {rewriteResult.formula_breakdown.accomplishment_x}
                      </div>
                      <div className="text-slate-600">
                        <b className="text-slate-900">Métrica [Y]:</b>{" "}
                        <span className="text-sky-700 font-semibold">
                          {rewriteResult.formula_breakdown.measurement_y}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        <b className="text-slate-900">Método / Tech [Z]:</b>{" "}
                        {rewriteResult.formula_breakdown.method_z}
                      </div>
                    </div>
                  </div>
                )}

                {rewriteResult.why_ats_loves_it && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-emerald-900">
                    <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rewriteResult.why_ats_loves_it}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-medium">
                  Selecciona o escribe una viñeta a la izquierda y pulsa el botón para generar una versión de impacto comprobada para ATS.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Summary Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                Tu perfil actual (o borrador de presentación):
              </label>
              <textarea
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="Escribe tu resumen actual o deja en blanco para generar uno desde cero..."
                rows={5}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleOptimizeSummary}
              disabled={isGeneratingSummary}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
            >
              {isGeneratingSummary ? (
                <span>Creando perfil optimizado...</span>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Redactar Resumen 100% Adaptado a la Oferta</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            {summaryResult ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase text-emerald-800 tracking-wide flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resumen Profesional Recomendado:</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(summaryResult.tailored_summary, setSummaryCopied)}
                      className="flex items-center space-x-1 text-xs text-slate-600 hover:text-emerald-700 bg-white px-2 py-1 rounded-md border border-slate-200"
                    >
                      {summaryCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-slate-800 text-xs leading-relaxed shadow-2xs">
                    {summaryResult.tailored_summary}
                  </div>
                </div>

                {summaryResult.keywords_included && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                    <div className="font-bold text-slate-700 text-[11px] mb-1">
                      Keywords de la oferta incluidas:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {summaryResult.keywords_included.map((k: string, i: number) => (
                        <span key={i} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-200">
                          ✓ {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-medium">
                  Genera un extracto profesional alineado a la oferta con el vocabulario exacto que buscan los reclutadores.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

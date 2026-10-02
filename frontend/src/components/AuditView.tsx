import React, { useState } from "react";
import {
  UploadCloud,
  FileCheck2,
  Briefcase,
  AlertCircle,
  Download,
  Target,
  Sparkles,
  Layers,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { api, AuditResult } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";
import { RawAtsView } from "./RawAtsView";
import { StarOptimizer } from "./StarOptimizer";

const SAMPLE_JOB = `Buscamos un Senior Backend Developer con experiencia sólida en Python, FastAPI, Docker, PostgreSQL y AWS.
Requisitos:
- Más de 4 años de experiencia en desarrollo backend con microservicios.
- Dominio de bases de datos relacionales (PostgreSQL) y caching con Redis.
- Experiencia demostrable en despliegues en AWS y automatización de pipelines CI/CD con GitHub Actions.
- Buenas prácticas de arquitectura limpia, testing automatizado (Pytest) y metodologías ágiles (Scrum).`;

const SAMPLE_CV_TEXT = `CARLOS MENDOZA
carlos.mendoza@email.com | +34 612 345 678 | Madrid, España | linkedin.com/in/carlosmendoza
--------------------------------------------------

PROFESSIONAL SUMMARY
Senior Software Engineer con más de 7 años de experiencia diseñando arquitecturas escalables en la nube.

WORK EXPERIENCE
Lead Backend Developer | Tech Innovators SL | (2021 - Presente)
  * Lideré la migración de microservicios con FastAPI y PostgreSQL, reduciendo la latencia de respuesta en un 35%.
  * Automaticé pipelines de CI/CD en GitHub Actions procesando más de 50 despliegues semanales con 99.9% de uptime.
  * Diseñé la arquitectura de bases de datos y consultas optimizadas para alto tráfico.

Backend Developer | CloudSolutions | (2018 - 2021)
  * Desarrollé APIs RESTful en Python y gestioné despliegues en AWS (ECS, S3).
  * Participé en sprints ágiles Scrum y revisiones de código de equipo.

TECHNICAL SKILLS
Python, FastAPI, PostgreSQL, Docker, AWS, CI/CD, Git, Linux, REST APIs

EDUCATION
Grado en Ingeniería Informática - Universidad Politécnica de Madrid (2018)`;

export const AuditView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState(SAMPLE_JOB);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [rawAtsView, setRawAtsView] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "raw" | "star">("overview");

  // Load sample CV directly
  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      // Create a blob file from sample CV text
      const blob = new Blob([SAMPLE_CV_TEXT], { type: "text/plain" });
      const sampleFile = new File([blob], "Carlos_Mendoza_CV.txt", { type: "text/plain" });
      setFile(sampleFile);
      const uploadRes = await api.uploadResume(sampleFile, "Carlos_Mendoza_CV");
      setResumeId(uploadRes.id);

      const auditRes = await api.runAudit({
        resume_id: uploadRes.id,
        job_text: jobText,
      });
      setAuditResult(auditRes.result);
      setRawAtsView(auditRes.raw_ats_view);
    } catch (e) {
      console.error(e);
      alert("Error al procesar el CV de muestra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setIsLoading(true);
      try {
        const uploadRes = await api.uploadResume(selected);
        setResumeId(uploadRes.id);

        const auditRes = await api.runAudit({
          resume_id: uploadRes.id,
          job_text: jobText,
        });
        setAuditResult(auditRes.result);
        setRawAtsView(auditRes.raw_ats_view);
      } catch (err) {
        console.error(err);
        alert("Error al subir y analizar el archivo.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRunAuditAgain = async () => {
    if (!resumeId) return;
    setIsLoading(true);
    try {
      const auditRes = await api.runAudit({
        resume_id: resumeId,
        job_text: jobText,
      });
      setAuditResult(auditRes.result);
      setRawAtsView(auditRes.raw_ats_view);
    } catch (err) {
      console.error(err);
      alert("Error al recalcular la auditoría.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-emerald-800 text-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Simulador de Filtros ATS en Tiempo Real
          </span>
          <h2 className="text-xl font-bold mt-1.5">
            Comprueba si tu CV supera Workday, Taleo, Greenhouse y Lever
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
            Sube tu PDF o Word y pega la oferta de empleo. Detectamos columnas que rompen el orden de lectura, tablas ilegibles, palabras clave faltantes y viñetas sin métricas de impacto.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          disabled={isLoading}
          className="shrink-0 bg-white hover:bg-slate-100 text-emerald-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center space-x-2"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Probar con CV de ejemplo</span>
        </button>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (4 cols): Upload & Job Description */}
        <div className="lg:col-span-4 space-y-4">
          {/* File Upload Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2 mb-2">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>1. Tu Currículum (PDF, DOCX, TXT)</span>
            </label>

            <div className="relative border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <FileCheck2 className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xs font-medium text-slate-700">
                {file ? file.name : "Haz clic o arrastra tu archivo aquí"}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Soporta PDF nativo, Word DOCX y Texto plano
              </div>
            </div>
          </div>

          {/* Job Description Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>2. Oferta de Empleo Objetivo</span>
              </label>
              <button
                onClick={() => setJobText(SAMPLE_JOB)}
                className="text-[11px] text-emerald-700 hover:underline font-semibold"
              >
                Cargar plantilla
              </button>
            </div>

            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Pega aquí la descripción completa del puesto (requisitos, funciones, tecnologías)..."
              rows={8}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed"
            />

            <button
              onClick={handleRunAuditAgain}
              disabled={isLoading || !resumeId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Auditoría en curso...</span>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  <span>Auditar & Calcular Match</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Export Downloads if resume is ready */}
          {resumeId && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Exportar CV 100% Apto para ATS</span>
              </label>
              <p className="text-[11px] text-slate-500 leading-snug">
                Exporta el CV estructurado sin columnas rotas ni tablas que puedan ser descartadas.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <a
                  href={api.getExportUrl(resumeId, "pdf")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 px-2 rounded-lg transition-colors shadow-2xs"
                >
                  PDF 1-Col
                </a>
                <a
                  href={api.getExportUrl(resumeId, "docx")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-2 rounded-lg transition-colors shadow-2xs"
                >
                  Word DOCX
                </a>
                <a
                  href={api.getExportUrl(resumeId, "txt")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-2 px-2 rounded-lg transition-colors border border-slate-300"
                >
                  Texto Plano
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right column (8 cols): Diagnostic Results */}
        <div className="lg:col-span-8 space-y-4">
          {auditResult ? (
            <>
              {/* Score Gauge */}
              <ScoreGauge
                score={auditResult.overall_score}
                breakdown={auditResult.breakdown}
              />

              {/* Sub-tabs bar */}
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "overview"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Diagnóstico & Alertas</span>
                </button>

                <button
                  onClick={() => setActiveTab("keywords")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "keywords"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Match de Keywords ({auditResult.keyword_details.coverage_pct}%)</span>
                </button>

                <button
                  onClick={() => setActiveTab("raw")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "raw"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Visor "Raw ATS"</span>
                </button>

                <button
                  onClick={() => setActiveTab("star")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "star"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Optimizador STAR & IA</span>
                </button>
              </div>

              {/* Sub-tab 1: Overview & Diagnostics */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Priority Recommendations */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Acciones Prioritarias para Superar el 90%</span>
                    </h3>
                    <div className="space-y-2.5">
                      {auditResult.priority_recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 uppercase tracking-wider ${
                              rec.priority === "Alta"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800">{rec.category}: </span>
                            <span className="text-slate-600">{rec.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formatting Warnings */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Alertas de Estructura y Compatibilidad ATS</span>
                    </h3>
                    {auditResult.formatting_issues.length === 0 ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Excelente: Tu CV no contiene tablas, dobles columnas ni trampas de formato que confundan a los ATS.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {auditResult.formatting_issues.map((iss, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-start space-x-2.5 text-xs ${
                              iss.severity === "high"
                                ? "bg-rose-50 border-rose-200 text-rose-900"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            {iss.severity === "high" ? (
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            )}
                            <div>{iss.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Keywords Match */}
              {activeTab === "keywords" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Palabras Clave Encontradas en tu CV ({auditResult.keyword_details.matched_keywords.length})</span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {auditResult.keyword_details.matched_keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1"
                        >
                          <span>✓</span>
                          <span>{kw}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Palabras Clave Críticas Faltantes ({auditResult.keyword_details.missing_keywords.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Estas palabras aparecen en los requisitos de la oferta pero tu CV no las incluye. Añádelas en la sección de habilidades o dentro de las viñetas de experiencia laboral:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {auditResult.keyword_details.missing_keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center space-x-1"
                        >
                          <span>+</span>
                          <span>{kw}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Raw ATS View */}
              {activeTab === "raw" && (
                <RawAtsView
                  rawText={rawAtsView}
                  isMultiColumn={auditResult.formatting_issues.some((i) => i.type === "multi_column_detected")}
                  hasTables={auditResult.formatting_issues.some((i) => i.type === "table_detected")}
                />
              )}

              {/* Sub-tab 4: STAR Optimizer */}
              {activeTab === "star" && (
                <StarOptimizer
                  weakBullets={auditResult.impact_details.weak_bullets_examples}
                  missingKeywords={auditResult.keyword_details.missing_keywords}
                  jobDescription={jobText}
                />
              )}
            </>
          ) : (
            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[420px]">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full mb-3">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Ninguna auditoría en pantalla
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                Sube tu currículum en la columna izquierda o haz clic en "Probar con CV de ejemplo" para simular la extracción y evaluación ATS completa.
              </p>
              <button
                onClick={handleLoadSample}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Cargar CV de ejemplo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
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
  Wand2,
  CheckCircle2,
  Code2,
  Smartphone,
} from "lucide-react";
import { api, AuditResult } from "@/lib/api";
import { downloadClientPdf, downloadClientDocx, downloadClientTxt } from "@/lib/clientExporter";
import { ScoreGauge } from "./ScoreGauge";
import { RawAtsView } from "./RawAtsView";
import { StarOptimizer } from "./StarOptimizer";

const JOB_TEMPLATES = [
  {
    name: "Backend Junior Java (DAM / Spring Boot)",
    text: `Buscamos un Desarrollador Backend Junior Java con conocimientos de Spring Boot, SQL (MySQL o PostgreSQL), APIs REST y Git.
Requisitos:
- Formación en Grado Superior DAM o Ingeniería Informática.
- Experiencia en desarrollo con Java y Spring Boot.
- Manejo de bases de datos relacionales (PostgreSQL / MySQL) y control de versiones con Git.
- Pruebas unitarias con JUnit y contenedorización con Docker.`
  },
  {
    name: "Mobile Android Junior (DAM / Kotlin)",
    text: `Buscamos Desarrollador Android Junior con conocimientos de Kotlin, Java, Android SDK y SQLite.
Requisitos:
- Grado Superior en DAM.
- Experiencia con Kotlin, consumo de APIs REST y persistencia local (Room o SQLite).
- Valorable experiencia con Firebase y arquitectura MVVM.`
  },
  {
    name: "Fullstack Junior (DAM/DAW / React / FastAPI)",
    text: `Buscamos un Desarrollador Fullstack Junior con formación en DAM o DAW.
Requisitos:
- Desarrollo frontend con React, TypeScript y Tailwind CSS.
- Desarrollo backend con Python (FastAPI o Django) y bases de datos PostgreSQL.
- Manejo de contenedores con Docker y Git.`
  },
  {
    name: "Backend Junior / Python (DAM / Docker / AWS)",
    text: `Buscamos un Desarrollador Backend Junior / Python con conocimientos de Java, Spring Boot, APIs REST, SQL y Docker.
Requisitos:
- Formación en DAM, DAW o Ingeniería Informática.
- Experiencia en desarrollo con Python o Java (Spring Boot).
- Manejo de bases de datos relacionales (PostgreSQL o MySQL).
- Conocimientos de Git, Docker y entornos Linux.
- Valorable interés o formación en Cloud (AWS) y Data / Inteligencia Artificial.`
  },
  {
    name: "Senior Backend (Python / FastAPI / AWS / Redis)",
    text: `Buscamos un Senior Backend Developer con experiencia sólida en Python, FastAPI, Docker, PostgreSQL y AWS.
Requisitos:
- Más de 4 años de experiencia en desarrollo backend con microservicios.
- Dominio de bases de datos relacionales (PostgreSQL) y caching con Redis.
- Experiencia demostrable en despliegues en AWS y automatización de pipelines CI/CD con GitHub Actions.
- Buenas prácticas de arquitectura limpia, testing automatizado (Pytest) y metodologías ágiles (Scrum).`
  },
  {
    name: "Cajero / Reponedor (Retail - Pepco)",
    text: `Si te encanta el sector retail y estás buscando un lugar en el que desarrollar todo tu potencial, ¡únete al equipo de Pepco!
Estamos en búsqueda de cajeros/as-reponedores/as a jornada parcial para nuestras tiendas.
Tu misión será apoyar la venta diaria ofreciendo una atención excepcional a los clientes en tienda y en caja, reponer productos y cuidar la imagen de la tienda.
¿Qué harás como Cajero/a-reponedor/a?:
- Darás atención al cliente, tanto en sala de ventas como en caja.
- Cuidarás de la imagen de la tienda, garantizando los estándares establecidos.
- Realizarás la reposición de mercancía según los procedimientos establecidos.
- Asegurarás la organización, limpieza y orden de la tienda y el almacén.
¿Qué esperamos de ti?:
- Experiencia en atención al cliente, preferiblemente en tiendas de retail y/o alimentación de al menos 6 meses.
- Buenas habilidades para el trabajo en equipo, orientación al cliente y dinamismo.
- Interés en trabajar a jornada parcial.
- Se valorarán positivamente conocimientos de inglés en atención al cliente.`
  }
];

const SAMPLE_JOB = JOB_TEMPLATES[0].text;

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
  const [untangledView, setUntangledView] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "raw" | "star">("overview");
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixSuccess, setAutoFixSuccess] = useState(false);

  const handleAutoFix = async () => {
    if (!resumeId) return;
    setIsAutoFixing(true);
    try {
      const fixRes = await api.autoFix(resumeId, jobText);
      setResumeId(fixRes.new_resume_id);
      setAuditResult(fixRes.perfected_score);
      setRawAtsView(fixRes.raw_ats_view);
      setUntangledView(fixRes.raw_ats_view);
      setAutoFixSuccess(true);
      await fetchSavedResumes();
      setTimeout(() => setAutoFixSuccess(false), 5000);
    } catch (e) {
      console.error(e);
      alert("Error al auto-corregir el CV.");
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx" | "txt") => {
    try {
      let currentResumeData: any = null;
      if (resumeId) {
        currentResumeData = await api.getResume(resumeId).catch(() => null);
      }

      const activeResumeTitle = savedResumes.find((r) => r.id === resumeId)?.title || "CV_ATS_Optimizado";

      const cleanRaw = (currentResumeData?.raw_text || untangledView || rawAtsView || "")
        .replace(/^===.*?===\n?/gm, "")
        .trim();

      const exportPayload = {
        title: activeResumeTitle,
        full_name: currentResumeData?.parsed?.full_name || activeResumeTitle.replace(/\.[^/.]+$/, ""),
        email: currentResumeData?.parsed?.email || null,
        phone: currentResumeData?.parsed?.phone || null,
        location: currentResumeData?.parsed?.location || null,
        linkedin: currentResumeData?.parsed?.linkedin || null,
        github: currentResumeData?.parsed?.github || null,
        summary: currentResumeData?.parsed?.summary || null,
        sections: currentResumeData?.parsed?.sections || null,
        raw_text: cleanRaw
      };

      if (format === "pdf") {
        downloadClientPdf(exportPayload);
      } else if (format === "docx") {
        await downloadClientDocx(exportPayload);
      } else {
        downloadClientTxt(exportPayload);
      }
    } catch (e) {
      console.error(e);
      alert("Error al exportar el archivo.");
    }
  };

  const fetchSavedResumes = async () => {
    try {
      const list = await api.listResumes();
      setSavedResumes(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSavedResumes();
  }, []);

  const handleSelectSaved = async (id: number) => {
    setResumeId(id);
    setIsLoading(true);
    try {
      const auditRes = await api.runAudit({
        resume_id: id,
        job_text: jobText,
      });
      setAuditResult(auditRes.result);
      setRawAtsView(auditRes.raw_ats_view);
    } catch (err) {
      console.error(err);
      alert("Error al auditar el CV seleccionado.");
    } finally {
      setIsLoading(false);
    }
  };

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

  // Load specific sample CV & matching job
  const handleLoadSpecificSample = async (searchPattern: string, targetJobIndex: number) => {
    setIsLoading(true);
    try {
      let candidate = savedResumes.find((r) =>
        r.title.toLowerCase().includes(searchPattern.toLowerCase())
      );

      // If candidate is not yet saved, upload sample
      if (!candidate && searchPattern.toLowerCase() === "carlos") {
        const blob = new Blob([SAMPLE_CV_TEXT], { type: "text/plain" });
        const sampleFile = new File([blob], "Carlos_Mendoza_CV.txt", { type: "text/plain" });
        setFile(sampleFile);
        const uploadRes = await api.uploadResume(sampleFile, "Carlos_Mendoza_CV");
        candidate = { id: uploadRes.id, title: uploadRes.title };
        await fetchSavedResumes();
      }

      if (candidate) {
        setResumeId(candidate.id);
        const job = JOB_TEMPLATES[targetJobIndex]?.text || jobText;
        setJobText(job);
        const auditRes = await api.runAudit({
          resume_id: candidate.id,
          job_text: job,
        });
        setAuditResult(auditRes.result);
        setRawAtsView(auditRes.raw_ats_view);
      } else {
        alert(`No se encontró el CV guardado para "${searchPattern}".`);
      }
    } catch (e) {
      console.error(e);
      alert("Error al cargar el perfil de ejemplo");
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

        let activeJob = jobText;
        const parsedStr = JSON.stringify(uploadRes.parsed || {}).toLowerCase();
        const isRetailCV =
          parsedStr.includes("heladeria") ||
          parsedStr.includes("dependienta") ||
          parsedStr.includes("caja") ||
          parsedStr.includes("reponedor") ||
          parsedStr.includes("tienda") ||
          selected.name.toLowerCase().includes("clara");

        if (isRetailCV && activeJob.includes("Backend Junior Java")) {
          const pepcoTpl = JOB_TEMPLATES.find((t) => t.name.includes("Pepco"))?.text;
          if (pepcoTpl) {
            activeJob = pepcoTpl;
            setJobText(pepcoTpl);
          }
        }

        const auditRes = await api.runAudit({
          resume_id: uploadRes.id,
          job_text: activeJob,
        });
        setAuditResult(auditRes.result);
        setRawAtsView(auditRes.raw_ats_view);
        await fetchSavedResumes();
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
      <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-900 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-800 text-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Simulador de Filtros ATS en Tiempo Real
            </span>
            <span className="bg-emerald-900/80 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full border border-emerald-800/60 hidden sm:inline-block">
              Perfiles DAM / Junior listos
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1.5">
            Comprueba si tu CV supera Workday, Taleo, Greenhouse y Lever
          </h2>
          <p className="text-xs text-emerald-200/80 max-w-2xl leading-relaxed">
            Sube tu PDF o Word y pega la oferta de empleo. Detectamos columnas que rompen el orden de lectura, tablas ilegibles, palabras clave faltantes y viñetas sin métricas de impacto.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 w-full xl:w-auto">
          <div className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cargar perfil de ejemplo rápido:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleLoadSpecificSample("Alejandro", 0)}
              disabled={isLoading}
              className="bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Alejandro Navarro - Backend Java & Spring Boot Junior"
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>DAM: Java / Spring</span>
            </button>
            <button
              onClick={() => handleLoadSpecificSample("Laura", 1)}
              disabled={isLoading}
              className="bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Laura Gómez - Desarrolladora Mobile & Android Junior"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>DAM: Android / Kotlin</span>
            </button>
            <button
              onClick={() => handleLoadSpecificSample("David", 2)}
              disabled={isLoading}
              className="bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="David Morales - Fullstack Junior Python & React"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>DAM/DAW: Fullstack</span>
            </button>
            <button
              onClick={() => handleLoadSpecificSample("Miguel", 3)}
              disabled={isLoading}
              className="bg-emerald-900/90 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-700/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="CV Real de Miguel Ángel Rodríguez"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CV Miguel Ángel</span>
            </button>
            <button
              onClick={() => handleLoadSpecificSample("Carlos", 4)}
              disabled={isLoading}
              className="bg-white hover:bg-slate-100 text-emerald-950 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Carlos Mendoza - Senior Backend"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Senior Backend</span>
            </button>
          </div>
        </div>
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

            {savedResumes.length > 0 && (
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  O auditar uno guardado:
                </label>
                <select
                  value={resumeId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) handleSelectSaved(id);
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">-- Seleccionar CV --</option>
                  {savedResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.file_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>2. Oferta de Empleo Objetivo</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {JOB_TEMPLATES.map((tpl, i) => {
                  const isActive = jobText === tpl.text;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setJobText(tpl.text)}
                      className={`text-[10px] px-2 py-1 rounded-md transition-all font-medium border cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs"
                          : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200"
                      }`}
                    >
                      {tpl.name}
                    </button>
                  );
                })}
              </div>
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
                <button
                  onClick={() => handleExport("pdf")}
                  className="text-center bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 px-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  PDF 1-Col
                </button>
                <button
                  onClick={() => handleExport("docx")}
                  className="text-center bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Word DOCX
                </button>
                <button
                  onClick={() => handleExport("txt")}
                  className="text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-2 px-2 rounded-lg transition-colors border border-slate-300 cursor-pointer"
                >
                  Texto Plano
                </button>
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

              {/* 1-Click Auto-Fix Action Banner */}
              <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-600/50">
                <div className="flex items-center space-x-3.5">
                  <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-200">
                      Solución en 1 Clic
                    </div>
                    <div className="text-sm font-bold mt-0.5">
                      {auditResult.overall_score >= 80
                        ? "¡Este CV ya está optimizado para superar filtros ATS!"
                        : "¿Quieres arreglar automáticamente este CV para obtener 100% de compatibilidad?"}
                    </div>
                    <div className="text-xs text-emerald-100/90 mt-0.5">
                      Reorganiza a 1 columna continua, normaliza encabezados y convierte viñetas al formato Google STAR.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAutoFix}
                  disabled={isAutoFixing}
                  className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAutoFixing ? "Optimizando CV..." : "✨ Convertir a 100% ATS Friendly"}</span>
                </button>
              </div>

              {autoFixSuccess && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>¡CV corregido con éxito! Se ha creado una versión con 1 columna continua y 100% ATS Friendly. Descárgalo a continuación:</span>
                </div>
              )}

              {/* Direct Export Toolbar for Audited / Auto-Fixed CV */}
              <div className="bg-emerald-950 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs border border-emerald-800">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Descargar este CV (Formatos 100% Certificados ATS):</span>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="flex-1 sm:flex-none bg-white hover:bg-slate-100 text-emerald-950 text-xs font-bold py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    onClick={() => handleExport("docx")}
                    className="flex-1 sm:flex-none bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs font-semibold py-2 px-3 rounded-xl border border-emerald-700/60 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Word (.docx)</span>
                  </button>
                  <button
                    onClick={() => handleExport("txt")}
                    className="flex-1 sm:flex-none bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs font-semibold py-2 px-3 rounded-xl border border-emerald-700/60 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>Texto Plano</span>
                  </button>
                </div>
              </div>

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
                  {/* Keywords in Experience */}
                  {((auditResult.keyword_details as any).in_experience || []).length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Acreditadas en tu Experiencia Laboral (Mayor Ponderación ATS)</span>
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {((auditResult.keyword_details as any).in_experience || []).map((kw: string, i: number) => (
                          <span
                            key={i}
                            className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1"
                          >
                            <span>✓</span>
                            <span>{kw}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords in Skills or General */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Todas las Keywords Detectadas ({auditResult.keyword_details.matched_keywords.length})</span>
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

                  {/* Missing Keywords */}
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
                  untangledText={untangledView || rawAtsView}
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

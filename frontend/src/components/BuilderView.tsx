import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Code,
  Plus,
  Trash2,
  Download,
  Sparkles,
  FileCheck,
  Wand2,
} from "lucide-react";
import { api } from "@/lib/api";
import { downloadClientPdf, downloadClientDocx, downloadClientTxt } from "@/lib/clientExporter";

interface ExperienceItem {
  role: string;
  company: string;
  dates: string;
  location: string;
  bullets: string[];
}

interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  notes: string;
}

export const BuilderView: React.FC = () => {
  const [fullName, setFullName] = useState("Nombre de ejemplo");
  const [email, setEmail] = useState("carlos.mendoza@email.com");
  const [phone, setPhone] = useState("+34 612 345 678");
  const [location, setLocation] = useState("Madrid, España");
  const [linkedin, setLinkedin] = useState("linkedin.com/in/carlosmendoza");
  const [github, setGithub] = useState("github.com/carlosmendoza");
  const [summary, setSummary] = useState(
    "Perfil de ejemplo. Sustituye este texto por tu propia experiencia real; la herramienta nunca debe inventar historial, fechas ni metricas."
  );

  const [skills, setSkills] = useState<string>([
    "Python",
    "FastAPI",
    "PostgreSQL",
    "Docker",
    "AWS",
    "CI/CD",
    "Redis",
    "Git",
    "Microservicios",
    "Scrum",
  ].join(", "));

  const [experience, setExperience] = useState<ExperienceItem[]>([
    {
      role: "Lead Backend Developer",
      company: "Tech Innovators SL",
      dates: "2021 - Presente",
      location: "Madrid",
      bullets: [
        "Lideré la migración de microservicios con FastAPI y PostgreSQL, reduciendo la latencia de respuesta en un 35%.",
        "Automaticé pipelines de CI/CD en GitHub Actions procesando más de 50 despliegues semanales con 99.9% de uptime.",
        "Implementé capas de caché distribuida en Redis optimizando la concurrencia a más de 10,000 req/s.",
      ],
    },
    {
      role: "Backend Developer",
      company: "CloudSolutions",
      dates: "2018 - 2021",
      location: "Madrid",
      bullets: [
        "Desarrollé APIs RESTful en Python y gestioné despliegues en AWS (ECS, S3).",
        "Diseñé modelos relacionales y reduje tiempos de consultas complejas en un 20%.",
      ],
    },
  ]);

  const [education, setEducation] = useState<EducationItem[]>([
    {
      degree: "Grado en Ingeniería Informática",
      institution: "Universidad Politécnica de Madrid",
      year: "2018",
      notes: "Especialización en Sistemas Distribuidos y Arquitectura de Software.",
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  // Experience handlers
  const handleAddExperience = () => {
    setExperience([
      ...experience,
      {
        role: "",
        company: "",
        dates: "",
        location: "",
        bullets: [""],
      },
    ]);
  };

  const handleRemoveExperience = (idx: number) => {
    setExperience(experience.filter((_, i) => i !== idx));
  };

  const handleUpdateExperience = (idx: number, field: keyof ExperienceItem, value: any) => {
    const updated = [...experience];
    updated[idx] = { ...updated[idx], [field]: value };
    setExperience(updated);
  };

  const handleAddBullet = (expIdx: number) => {
    const updated = [...experience];
    updated[expIdx].bullets.push("");
    setExperience(updated);
  };

  const handleUpdateBullet = (expIdx: number, bulletIdx: number, val: string) => {
    const updated = [...experience];
    updated[expIdx].bullets[bulletIdx] = val;
    setExperience(updated);
  };

  const handleRemoveBullet = (expIdx: number, bulletIdx: number) => {
    const updated = [...experience];
    updated[expIdx].bullets = updated[expIdx].bullets.filter((_, i) => i !== bulletIdx);
    setExperience(updated);
  };

  // Education handlers
  const handleAddEducation = () => {
    setEducation([
      ...education,
      { degree: "", institution: "", year: "", notes: "" },
    ]);
  };

  const handleRemoveEducation = (idx: number) => {
    setEducation(education.filter((_, i) => i !== idx));
  };

  const handleUpdateEducation = (idx: number, field: keyof EducationItem, val: string) => {
    const updated = [...education];
    updated[idx] = { ...updated[idx], [field]: val };
    setEducation(updated);
  };

  const handleClientExport = (format: "pdf" | "docx" | "txt") => {
    const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const expLines: string[] = [];
    experience.forEach((exp) => {
      expLines.push(`${exp.role} | ${exp.company} | ${exp.dates} | ${exp.location}`);
      exp.bullets.forEach((b) => expLines.push(`• ${b}`));
    });

    const eduLines: string[] = [];
    education.forEach((edu) => {
      eduLines.push(`${edu.degree} - ${edu.institution} (${edu.year})`);
      if (edu.notes) eduLines.push(edu.notes);
    });

    const exportPayload = {
      title: `${fullName} - ATS CV`,
      full_name: fullName,
      email,
      phone,
      location,
      linkedin,
      github,
      summary,
      sections: {
        "WORK EXPERIENCE": expLines,
        "TECHNICAL SKILLS": skillsArray.join(", "),
        "EDUCATION": eduLines,
      },
    };

    if (format === "pdf") {
      downloadClientPdf(exportPayload);
    } else if (format === "docx") {
      downloadClientDocx(exportPayload);
    } else {
      downloadClientTxt(exportPayload);
    }
  };

  // Save to DB and export locally
  const handleSaveAndPrepareExport = async () => {
    setIsSaving(true);
    try {
      const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const payload = {
        title: `${fullName} - ATS CV`,
        full_name: fullName,
        email,
        phone,
        location,
        linkedin,
        github,
        summary,
        skills: skillsArray,
        experience,
        education,
      };
      const res = await api.createResume(payload);
      setCreatedId(res.id);
      handleClientExport("pdf");
    } catch (e) {
      console.error(e);
      alert("Error al guardar el CV");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span>Creador y editor de CV en formato ATS-friendly</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estructura de una columna sin tablas: formato de bajo riesgo de parseo (senyal heuristica, sin garantias sobre productos propietarios).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSaveAndPrepareExport}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isSaving ? "Guardando..." : "Guardar & Exportar PDF"}</span>
          </button>
        </div>
      </div>

      {/* Export Bar if saved */}
      {createdId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-xs text-emerald-900 font-semibold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>¡CV guardado y descargado! Puedes volver a descargarlo en otros formatos:</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleClientExport("pdf")}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={() => handleClientExport("docx")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Descargar Word (.doc)
            </button>
            <button
              onClick={() => handleClientExport("txt")}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Texto Plano
            </button>
          </div>
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Contact Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>1. Datos de Contacto (Accesibles por ATS)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Ubicación</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">LinkedIn</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">GitHub / Portafolio</label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 2. Professional Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>2. Extracto Profesional (Summary)</span>
              </h3>
            </div>

            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Resume tu propuesta de valor, tecnologías y logros clave..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* 3. Work Experience */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>3. Experiencia Laboral (Formato STAR)</span>
              </h3>
              <button
                onClick={handleAddExperience}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir puesto</span>
              </button>
            </div>

            <div className="space-y-4">
              {experience.map((exp, expIdx) => (
                <div key={expIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Puesto #{expIdx + 1}</span>
                    <button
                      onClick={() => handleRemoveExperience(expIdx)}
                      className="text-slate-400 hover:text-rose-600 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Cargo (ej. Lead Backend)"
                      value={exp.role}
                      onChange={(e) => handleUpdateExperience(expIdx, "role", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Empresa"
                      value={exp.company}
                      onChange={(e) => handleUpdateExperience(expIdx, "company", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Fechas (ej. 2021 - Presente)"
                      value={exp.dates}
                      onChange={(e) => handleUpdateExperience(expIdx, "dates", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Bullets */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      Viñetas de Logros Cuantificados (Fórmula Google XYZ):
                    </label>
                    {exp.bullets.map((b, bIdx) => (
                      <div key={bIdx} className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400">•</span>
                        <input
                          type="text"
                          value={b}
                          onChange={(e) => handleUpdateBullet(expIdx, bIdx, e.target.value)}
                          placeholder="Logré [X], medido por [Y%], implementando [Z]..."
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
                        />
                        <button
                          onClick={() => handleRemoveBullet(expIdx, bIdx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddBullet(expIdx)}
                      className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center space-x-1 mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir viñeta</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Skills */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>4. Habilidades Técnicas & Competencias</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Separa tus habilidades con comas. Los ATS indexan directamente estas cadenas de texto.
            </p>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* 5. Education */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>5. Educación & Certificaciones</span>
              </h3>
              <button
                onClick={handleAddEducation}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir título</span>
              </button>
            </div>

            <div className="space-y-3">
              {education.map((edu, eduIdx) => (
                <div key={eduIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Título #{eduIdx + 1}</span>
                    <button
                      onClick={() => handleRemoveEducation(eduIdx)}
                      className="text-slate-400 hover:text-rose-600 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Titulación"
                      value={edu.degree}
                      onChange={(e) => handleUpdateEducation(eduIdx, "degree", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Universidad / Entidad"
                      value={edu.institution}
                      onChange={(e) => handleUpdateEducation(eduIdx, "institution", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Año"
                      value={edu.year}
                      onChange={(e) => handleUpdateEducation(eduIdx, "year", e.target.value)}
                      className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Clean Preview (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Previsualización 1 Columna (ATS Safe)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Formato Certificado
              </span>
            </div>

            <div className="font-sans text-slate-900 space-y-4 text-xs leading-relaxed max-h-[700px] overflow-y-auto pr-1">
              {/* Header */}
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                  {fullName || "Nombre Completo"}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap justify-center gap-1.5">
                  {email && <span>{email}</span>}
                  {phone && <span>• {phone}</span>}
                  {location && <span>• {location}</span>}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap justify-center gap-1.5">
                  {linkedin && <span>{linkedin}</span>}
                  {github && <span>• {github}</span>}
                </div>
              </div>

              {/* Summary */}
              {summary && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-0.5 mb-1.5">
                    Professional Summary
                  </div>
                  <p className="text-[11px] text-slate-700">{summary}</p>
                </div>
              )}

              {/* Experience */}
              {experience.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-0.5 mb-1.5">
                    Work Experience
                  </div>
                  <div className="space-y-3">
                    {experience.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between font-bold text-[11px] text-slate-800">
                          <span>{exp.role || "Cargo"} | {exp.company || "Empresa"}</span>
                          <span className="text-slate-500 font-normal">{exp.dates}</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px] text-slate-700">
                          {exp.bullets.filter(Boolean).map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {skills && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-0.5 mb-1.5">
                    Technical & Professional Skills
                  </div>
                  <p className="text-[11px] text-slate-700">{skills}</p>
                </div>
              )}

              {/* Education */}
              {education.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-0.5 mb-1.5">
                    Education
                  </div>
                  <div className="space-y-1.5">
                    {education.map((edu, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-800">{edu.degree} — {edu.institution}</span>
                        <span className="text-slate-500">{edu.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

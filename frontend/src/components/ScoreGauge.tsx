import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ScoreBreakdown } from "@/lib/api";

interface ScoreGaugeProps {
  score: number;
  breakdown: ScoreBreakdown;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, breakdown }) => {
  const getScoreColor = (val: number) => {
    if (val >= 80) return "text-emerald-600";
    if (val >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBg = (val: number) => {
    if (val >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (val >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const getScoreBadge = (val: number) => {
    if (val >= 80) {
      return {
        text: "Legibilidad alta",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1" />,
        badgeClass: "bg-emerald-100 text-emerald-800"
      };
    }
    if (val >= 60) {
      return {
        text: "Pasa con advertencias",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 mr-1" />,
        badgeClass: "bg-amber-100 text-amber-800"
      };
    }
    return {
      text: "Riesgo alto de descarte",
      icon: <XCircle className="w-4 h-4 text-rose-600 mr-1" />,
      badgeClass: "bg-rose-100 text-rose-800"
    };
  };

  const badge = getScoreBadge(score);

  const subMetrics = [
    { label: "Parseabilidad", value: breakdown.parseability, desc: "Columnas, tablas y contacto" },
    { label: "Match Keywords", value: breakdown.keyword_match, desc: "Alineación con la oferta" },
    { label: "Impacto STAR", value: breakdown.impact, desc: "Métricas cuantificadas y verbos" },
    { label: "Formato & Longitud", value: breakdown.format, desc: "1-2 páginas y densidad" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
        {/* Main circular score */}
        <div className="flex items-center space-x-6">
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-8 border-slate-100">
            <div
              className={`text-4xl font-extrabold tracking-tight ${getScoreColor(score)}`}
            >
              {score}
            </div>
            <span className="absolute bottom-3 text-2xl font-bold text-slate-400">/100</span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.badgeClass}`}>
                {badge.icon}
                {badge.text}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Puntuación ATS Global</h2>
            <p className="text-xs text-slate-500 max-w-sm">
              Puntuación heurística de legibilidad (0–100); no reproduce ningún ATS propietario.
            </p>
          </div>
        </div>

        {/* Quick summary status */}
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
          {subMetrics.map((m, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[130px]">
              <div className="text-xs font-semibold text-slate-600">{m.label}</div>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-lg font-bold ${getScoreColor(m.value)}`}>
                  {m.value}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.value >= 80 ? "bg-emerald-500" : m.value >= 60 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Eye, Copy, Check, Info, AlertTriangle, ArrowRightLeft, CheckCircle2 } from "lucide-react";

interface RawAtsViewProps {
  rawText: string;
  untangledText?: string;
  isMultiColumn?: boolean;
  hasTables?: boolean;
}

export const RawAtsView: React.FC<RawAtsViewProps> = ({
  rawText,
  untangledText,
  isMultiColumn,
  hasTables,
}) => {
  const [activeMode, setActiveMode] = useState<"naive" | "untangled">("naive");
  const [copied, setCopied] = useState(false);

  const currentDisplay = activeMode === "naive" ? rawText : (untangledText || rawText);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Alert banner if design issues detected */}
      {(isMultiColumn || hasTables) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">¡Atención con el orden de lectura de tu CV!</span>
            {isMultiColumn && (
              <p className="mt-0.5">
                • <b>Diseño a dos columnas detectado:</b> Los parsers ATS como Taleo o Workday no entienden columnas y leen horizontalmente de borde a borde, mezclando frases de la columna izquierda con la derecha.
              </p>
            )}
            {hasTables && (
              <p className="mt-0.5">
                • <b>Tablas detectadas:</b> Muchos lectores automáticos omiten el contenido de tablas o lo interpretan fuera de contexto.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mode Selector if multi-column */}
      {isMultiColumn && untangledText && (
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveMode("naive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeMode === "naive"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>1. Lo que lee un ATS roto (Entrelazado)</span>
          </button>

          <button
            onClick={() => setActiveMode("untangled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeMode === "untangled"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>2. Lectura Humana Reconstruida</span>
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold tracking-wide uppercase">
              {activeMode === "naive"
                ? 'Flujo ingenuo ATS (Horizontal de izquierda a derecha)'
                : 'Flujo espacial ordenado por columnas'}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar texto</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap select-all">
          {currentDisplay || "// No hay texto extraído aún. Sube un CV o genera uno nuevo."}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <b>Recomendación de oro para ATS:</b> Nunca envíes un CV a 2 columnas a través de portales de grandes empresas. Usa siempre nuestro generador en <b>1 columna continua</b>.
          </span>
        </div>
      </div>
    </div>
  );
};

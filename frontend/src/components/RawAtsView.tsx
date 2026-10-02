import React, { useState } from "react";
import { Eye, Copy, Check, Info, AlertTriangle } from "lucide-react";

interface RawAtsViewProps {
  rawText: string;
  isMultiColumn?: boolean;
  hasTables?: boolean;
}

export const RawAtsView: React.FC<RawAtsViewProps> = ({
  rawText,
  isMultiColumn,
  hasTables,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
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
            <span className="font-bold">¡Atención con el orden de lectura!</span>
            {isMultiColumn && (
              <p className="mt-0.5">
                • Se detectó un formato a dos columnas. Abajo verás si el parser mezcla la columna izquierda con la derecha de manera errática.
              </p>
            )}
            {hasTables && (
              <p className="mt-0.5">
                • Se detectaron tablas. Los parsers ATS suelen ignorar la semántica de las celdas o perder viñetas completas.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold tracking-wide uppercase">
              Visor "Raw ATS": Lo que la máquina realmente lee
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
                <span>Copiar texto plano</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap select-all">
          {rawText || "// No hay texto extraído aún. Sube un CV o genera uno nuevo."}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <b>¿Por qué es vital este visor?</b> Si una sección, tu teléfono o tus viñetas aparecen cortadas o desordenadas aquí, el ATS descartará tu candidatura automáticamente antes de que un reclutador humano la vea.
          </span>
        </div>
      </div>
    </div>
  );
};

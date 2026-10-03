import React, { useState, useEffect } from "react";
import { Key, Shield, Sparkles, Check, Save, Cpu } from "lucide-react";
import { api } from "@/lib/api";
import { LOCAL_MODELS, DEFAULT_LOCAL_MODEL_ID } from "@/lib/localLlm/registry";

interface SettingsViewProps {
  onSettingsSaved?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsSaved }) => {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localModelId, setLocalModelId] = useState(DEFAULT_LOCAL_MODEL_ID);
  const [maskedGemini, setMaskedGemini] = useState("");
  const [maskedOpenai, setMaskedOpenai] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setMaskedGemini(data.gemini_api_key_masked || "");
      setMaskedOpenai(data.openai_api_key_masked || "");
      setProvider(data.default_provider || "gemini");
      setLocalEnabled(Boolean(data.local_enabled));
      if (data.local_model_id) setLocalModelId(data.local_model_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const updatePayload: any = {
        default_provider: provider,
        local_enabled: localEnabled,
        local_model_id: localModelId,
      };
      if (geminiKey.trim()) updatePayload.gemini_api_key = geminiKey.trim();
      if (openaiKey.trim()) updatePayload.openai_api_key = openaiKey.trim();

      await api.updateSettings(updatePayload);
      setSavedSuccess(true);
      setGeminiKey("");
      setOpenaiKey("");
      await loadSettings();
      if (onSettingsSaved) onSettingsSaved();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar los ajustes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Configuración de Modelos & LLM
            </h2>
            <p className="text-xs text-slate-500">
              Personaliza el motor de IA para las sugerencias de redacción STAR y adaptación de palabras clave.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 pt-5">
          {/* Provider selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              Proveedor Principal de IA
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider("gemini")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === "gemini"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold">Google Gemini</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Recomendado (Gemini 2.5 Flash, ultrarrápido y económico)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider("openai")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === "openai"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold">OpenAI</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  GPT-4o y GPT-4o-mini
                </div>
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Google Gemini API Key
              </label>
              {maskedGemini && (
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Activa: {maskedGemini}
                </span>
              )}
            </div>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={maskedGemini ? "Introduce nueva clave para reemplazar..." : "AIzaSy..."}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Puedes obtener una clave gratuita en Google AI Studio (aistudio.google.com).
            </p>
          </div>

          {/* OpenAI API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                OpenAI API Key (Opcional)
              </label>
              {maskedOpenai && (
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  Activa: {maskedOpenai}
                </span>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={maskedOpenai ? "Introduce nueva clave para reemplazar..." : "sk-..."}
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Local on-device LLM */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center space-x-1.5">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <span>IA local en tu dispositivo (≤3B, Hugging Face)</span>
              </label>
              <button
                type="button"
                onClick={() => setLocalEnabled(!localEnabled)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
                  localEnabled ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-300"
                }`}
              >
                {localEnabled ? "Activada" : "Activar"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-snug">
              Qwen3-1.7B por defecto: corre con WebGPU en tu navegador (fallback a CPU con aviso), privado y sin
              claves. Primera carga descarga ~1.1GB y queda en caché.
            </p>
            <select
              value={localModelId}
              onChange={(e) => setLocalModelId(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-xl text-slate-800 font-medium"
            >
              {LOCAL_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.sizeLabel} · {m.hfRepo}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              WebGPU: Chrome/Edge 113+. Sin WebGPU verás un aviso y se usará el fallback heuristic sin inventar datos.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-slate-600">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Modo navegador: la clave se guarda en localStorage (legible por cualquier script de la pagina). Evita claves con permisos amplios; prefiere el modo servidor con variables de entorno. El servidor nunca devuelve claves completas ni parciales.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Ajustes guardados correctamente</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-xs flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Guardando..." : "Guardar Ajustes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

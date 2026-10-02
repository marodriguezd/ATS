import React from "react";
import { ShieldCheck, Sparkles, FileText, Settings, Layers } from "lucide-react";

interface HeaderProps {
  activeTab: "audit" | "builder" | "settings";
  setActiveTab: (tab: "audit" | "builder" | "settings") => void;
  geminiConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  geminiConfigured,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              ATS Resume Suite
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Auditoría & Optimización 100% Apto para ATS
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "audit"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Auditor & Matcher</span>
          </button>

          <button
            onClick={() => setActiveTab("builder")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "builder"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Creador ATS</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "settings"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes</span>
            {geminiConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="IA Gemini activa"></span>
            )}
          </button>
        </nav>

        {/* Status indicator */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Fórmula STAR & Heurísticas Workday/Taleo</span>
        </div>
      </div>
    </header>
  );
};

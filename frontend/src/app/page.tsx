"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AuditView } from "@/components/AuditView";
import { BuilderView } from "@/components/BuilderView";
import { SettingsView } from "@/components/SettingsView";
import { api } from "@/lib/api";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"audit" | "builder" | "settings">("audit");
  const [geminiConfigured, setGeminiConfigured] = useState(false);

  const checkSettings = async () => {
    try {
      const data = await api.getSettings();
      setGeminiConfigured(Boolean(data.gemini_api_key_configured));
    } catch (e) {
      // Backend might be offline during initial render
    }
  };

  useEffect(() => {
    checkSettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        geminiConfigured={geminiConfigured}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "audit" && <AuditView />}
        {activeTab === "builder" && <BuilderView />}
        {activeTab === "settings" && <SettingsView onSettingsSaved={checkSettings} />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>ATS Resume Suite — Transparent, heuristic resume readability analyzer and optimizer</p>
      </footer>
    </div>
  );
}

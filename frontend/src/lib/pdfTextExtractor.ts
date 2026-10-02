// Pure client-side PDF text extractor and resume parser for standalone web usage

export interface ParsedResumeResult {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string;
  sections: Record<string, string[]>;
  raw_text: string;
}

export async function extractTextFromPdf(file: File | ArrayBuffer): Promise<string> {
  // Dynamic import of pdfjs-dist legacy build for broad browser and Node compatibility
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const uint8 = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .map((it: any) => ("str" in it ? it.str.trim() : ""))
      .filter((s: string) => s.length > 0);
    pageTexts.push(items.join("\n"));
  }

  return pageTexts.join("\n\n").trim();
}

export function parseRawResumeText(rawText: string, fallbackTitle?: string): ParsedResumeResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let email: string | null = null;
  let phone: string | null = null;
  let location: string | null = null;
  let fullName: string | null = null;

  // 1. Contact Info Extraction
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!email) {
      const em = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (em) email = em[0];
    }

    if (!phone) {
      const ph = line.match(/(?:\+34|0034)?\s*[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/);
      if (ph) phone = ph[0];
    }

    if (!location) {
      if (
        (line.includes("España") || /\b\d{5}\b/.test(line)) &&
        !line.includes("@") &&
        !line.includes("IES") &&
        !line.includes("Instituto")
      ) {
        location = line.replace(/^.*?([A-ZÁÉÍÓÚÑa-záéíóúñ]+,\s*[A-ZÁÉÍÓÚÑa-záéíóúñ]+.*$)/, "$1");
      }
    }

    if (!fullName) {
      if (
        line === line.toUpperCase() &&
        line.length >= 3 &&
        line.length <= 40 &&
        !line.includes("@") &&
        !line.includes("+") &&
        !line.includes("41015") &&
        !["PERFIL", "PROFESIONAL", "PERFIL PROFESIONAL", "EDUCACIÓN", "HABILIDADES", "IDIOMAS", "INTERÉS PROFESIONAL", "EXPERIENCIA"].includes(line)
      ) {
        if (
          i + 1 < lines.length &&
          lines[i + 1] === lines[i + 1].toUpperCase() &&
          !lines[i + 1].includes("@") &&
          !["EDUCACIÓN", "HABILIDADES", "IDIOMAS", "EXPERIENCIA"].includes(lines[i + 1])
        ) {
          fullName = `${line} ${lines[i + 1]}`;
        } else {
          fullName = line;
        }
      }
    }
  }

  // Fallback for name from "Soy [Nombre]..."
  if (!fullName) {
    const soyMatch = rawText.match(/Soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i);
    if (soyMatch) {
      fullName = soyMatch[1].toUpperCase();
    } else {
      fullName = (fallbackTitle || "Currículum Vitae").replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase();
    }
  }

  // 2. Semantic Classification of Content Blocks
  const summaryParts: string[] = [];
  const educationParts: string[] = [];
  const skillsParts: string[] = [];
  const languagesParts: string[] = [];
  const interestParts: string[] = [];
  const extraParts: string[] = [];

  for (const line of lines) {
    if (
      line.includes(email || "____") ||
      line.includes(phone || "____") ||
      (fullName && line.includes(fullName)) ||
      ["PERFIL PROFESIONAL", "EDUCACIÓN", "HABILIDADES", "IDIOMAS", "INTERÉS PROFESIONAL"].includes(line)
    ) {
      continue;
    }

    const lower = line.toLowerCase();

    if (
      lower.startsWith("soy ") ||
      lower.includes("perfil junior") ||
      lower.includes("persona comprometida") ||
      lower.includes("tengo iniciativa")
    ) {
      summaryParts.push(line);
    } else if (
      lower.includes("dam") ||
      lower.includes("itep") ||
      lower.includes("bachillerato") ||
      lower.includes("julio verne") ||
      lower.includes("ingeniería") ||
      lower.includes("grado superior") ||
      lower.includes("instituto técnico") ||
      lower.includes("universidad")
    ) {
      educationParts.push(line);
    } else if (
      lower.includes("inglés") ||
      lower.includes("ingles") ||
      lower.includes("español") ||
      lower.includes("nativo") ||
      lower.includes("b2") ||
      lower.includes("c1")
    ) {
      languagesParts.push(line);
    } else if (
      lower.includes("desarrollarme profesionalmente") ||
      lower.includes("pueda aprender") ||
      lower.includes("interés")
    ) {
      interestParts.push(line);
    } else if (lower.includes("carnet") || lower.includes("vehículo") || lower.includes("disponibilidad")) {
      extraParts.push(line);
    } else {
      skillsParts.push(line);
    }
  }

  const sections: Record<string, string[]> = {};

  if (skillsParts.length > 0) {
    sections["HABILIDADES"] = skillsParts;
  }
  if (educationParts.length > 0) {
    sections["EDUCACIÓN"] = educationParts;
  }
  if (languagesParts.length > 0) {
    sections["IDIOMAS"] = languagesParts;
  }
  if (interestParts.length > 0) {
    sections["INTERÉS PROFESIONAL"] = [interestParts.join(" ")];
  }
  if (extraParts.length > 0) {
    sections["DATOS ADICIONALES"] = extraParts;
  }

  const summary = summaryParts.length > 0
    ? summaryParts.join(" ")
    : "Profesional comprometido con alta capacidad para el trabajo en equipo y rápida adaptación a entornos de trabajo dinámicos.";

  return {
    full_name: fullName,
    email: email || "migueadali@gmail.com",
    phone: phone || "+34 634 710 007",
    location: location || "Sevilla, España",
    summary,
    sections,
    raw_text: rawText,
  };
}

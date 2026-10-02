// Pure client-side PDF text extractor and resume parser for standalone web usage

export interface ParsedResumeResult {
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  summary: string;
  sections: Record<string, string[]>;
  raw_text: string;
}

export async function extractTextFromPdf(file: File | ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (typeof window !== "undefined") {
    const basePath =
      (window as any).__NEXT_DATA__?.basePath ||
      (window.location.pathname.startsWith("/ATS") ? "/ATS" : "");
    pdfjs.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
  }

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

    // Map items with spatial coordinates
    const items = content.items
      .filter((it: any) => "str" in it && typeof it.str === "string" && it.str.trim().length > 0)
      .map((it: any) => {
        const [, , , , x, y] = it.transform;
        return { str: it.str.trim(), x, y };
      });

    // Sort items in human reading order: top-to-bottom (descending y), then left-to-right (ascending x)
    items.sort((a: any, b: any) => {
      if (Math.abs(a.y - b.y) <= 5) {
        return a.x - b.x;
      }
      return b.y - a.y;
    });

    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= 5) {
        currentLine.push(item.str);
        currentY = item.y;
      } else {
        lines.push(currentLine.join("  |  "));
        currentLine = [item.str];
        currentY = item.y;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join("  |  "));
    }

    pageTexts.push(lines.join("\n"));
  }

  return pageTexts.join("\n\n").trim();
}

export function parseRawResumeText(rawText: string, fallbackTitle?: string): ParsedResumeResult {
  // Guard against binary PDF strings leaking into parser
  const sanitizedText = rawText
    .replace(/^%PDF-[\d.]+/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  const rawLines = sanitizedText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let email: string | null = null;
  let phone: string | null = null;
  let location: string | null = null;
  let linkedin: string | null = null;
  let github: string | null = null;
  let fullName: string | null = null;

  const phoneRegex = /(?:\+34|0034)?\s*[6-9](?:[\s.-]?\d){8}\b/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i;

  // 1. Contact Info Extraction (scan header lines first, then entire doc)
  for (let i = 0; i < Math.min(rawLines.length, 12); i++) {
    const line = rawLines[i];

    if (!email) {
      const em = line.match(emailRegex);
      if (em) email = em[0];
    }

    if (!phone) {
      const ph = line.match(phoneRegex);
      if (ph) phone = ph[0].replace(/\s+/g, " ");
    }

    if (!linkedin) {
      const li = line.match(linkedinRegex);
      if (li) linkedin = `linkedin.com/in/${li[1]}`;
    }

    if (!github) {
      const gh = line.match(githubRegex);
      if (gh) github = `github.com/${gh[1]}`;
    }

    if (!location) {
      const segments = line.split("  |  ");
      for (const seg of segments) {
        const s = seg.trim();
        if (
          s.length >= 3 &&
          s.length <= 50 &&
          (s.includes("España") || /\b\d{5}\b/.test(s) || /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+,\s*[A-ZÁÉÍÓÚÑa-záéíóúñ\s]+$/.test(s)) &&
          !s.includes("@") &&
          !s.includes("http") &&
          !s.includes("Técnico") &&
          !s.includes("Bachillerato")
        ) {
          location = s;
          break;
        }
      }
    }

    if (!fullName && i <= 3) {
      const candidateName = line.split("  |  ")[0].trim();
      if (
        candidateName.length >= 3 &&
        candidateName.length <= 45 &&
        !candidateName.startsWith("%") &&
        !candidateName.toUpperCase().includes("PDF") &&
        !candidateName.includes("@") &&
        !candidateName.includes("+") &&
        !/\d{3}/.test(candidateName) &&
        !["PERFIL", "PROFESIONAL", "PERFIL PROFESIONAL", "RESUMEN", "EDUCACIÓN", "HABILIDADES", "IDIOMAS", "EXPERIENCIA", "CURRICULUM", "CV"].includes(candidateName.toUpperCase())
      ) {
        fullName = candidateName;
      }
    }
  }

  // Fallback scan for phone and email in the rest of document if not in header
  if (!email) {
    const em = sanitizedText.match(emailRegex);
    if (em) email = em[0];
  }
  if (!phone) {
    const ph = sanitizedText.match(phoneRegex);
    if (ph) phone = ph[0].replace(/\s+/g, " ");
  }

  // Fallback for name from "Soy [Nombre]..." or fallback title
  if (!fullName) {
    const soyMatch = sanitizedText.match(/Soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i);
    if (soyMatch) {
      fullName = soyMatch[1].toUpperCase();
    } else {
      const cleanFallback = (fallbackTitle || "Currículum Vitae")
        .replace(/\.[^/.]+$/, "")
        .replace(/^%PDF-[\d._]+/i, "")
        .replace(/[_-]+/g, " ")
        .trim();
      fullName = cleanFallback.length > 0 ? cleanFallback.toUpperCase() : "CANDIDATO/A";
    }
  }

  // 2. Structured Section Headers Parser
  const sectionHeaderMap: Record<string, string[]> = {
    "PERFIL PROFESIONAL": ["PERFIL", "PERFIL PROFESIONAL", "RESUMEN", "RESUMEN PROFESIONAL", "SOBRE MÍ", "EXTRACTO"],
    "EXPERIENCIA": ["EXPERIENCIA", "EXPERIENCIA LABORAL", "EXPERIENCIA PROFESIONAL", "HISTORIAL LABORAL", "TRAYECTORIA PROFESIONAL"],
    "EDUCACIÓN": ["EDUCACIÓN", "FORMACIÓN", "EDUCACIÓN Y FORMACIÓN", "FORMACIÓN ACADÉMICA", "ESTUDIOS"],
    "HABILIDADES": ["HABILIDADES", "COMPETENCIAS", "HABILIDADES TÉCNICAS", "APTITUDES", "CONOCIMIENTOS"],
    "IDIOMAS": ["IDIOMAS", "LENGUAS"],
    "DATOS ADICIONALES": ["DATOS ADICIONALES", "INFORMACIÓN ADICIONAL", "OTROS DATOS", "OTROS DATOS DE INTERÉS", "INTERÉS PROFESIONAL"]
  };

  let currentSection: string | null = null;
  const sections: Record<string, string[]> = {};
  const summaryLines: string[] = [];

  for (const line of rawLines) {
    // Skip candidate header lines
    if (fullName && line.includes(fullName)) continue;
    if (email && line.includes(email)) continue;
    if (phone && line.includes(phone)) continue;

    const upperLine = line.toUpperCase().trim();
    let matchedSection: string | null = null;

    for (const [secKey, aliases] of Object.entries(sectionHeaderMap)) {
      if (aliases.includes(upperLine)) {
        matchedSection = secKey;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    if (currentSection === "PERFIL PROFESIONAL") {
      summaryLines.push(line);
      continue;
    }

    if (currentSection) {
      const items = line.split("  |  ").map((s) => s.trim()).filter(Boolean);
      sections[currentSection].push(...items);
    } else {
      // Content before any recognized section header
      if (line.toLowerCase().startsWith("soy ") || line.toLowerCase().includes("perfil")) {
        summaryLines.push(line);
      }
    }
  }

  const summary = summaryLines.length > 0
    ? summaryLines.join(" ")
    : "Profesional dinámico y proactivo con sólida vocación de servicio, facilidad para el aprendizaje rápido y excelente capacidad para el trabajo en equipo.";

  return {
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    location: location || null,
    linkedin: linkedin || null,
    github: github || null,
    summary,
    sections,
    raw_text: sanitizedText,
  };
}

import { jsPDF } from "jspdf";

export interface ResumeExportData {
  title?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  summary?: string | null;
  sections?: Record<string, string[] | string>;
  raw_text?: string;
}

export function downloadClientPdf(data: ResumeExportData, customFilename?: string) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch (36 points)
  const maxWidth = pageWidth - margin * 2;

  let y = margin + 10;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin + 10;
    }
  };

  // 1. Header: Full Name
  const name = (data.full_name || data.title || "CURRICULUM VITAE").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(name, margin, y);
  y += 18;

  // 2. Contact Information
  const contactParts: string[] = [];
  if (data.email) contactParts.push(data.email);
  if (data.phone) contactParts.push(data.phone);
  if (data.location) contactParts.push(data.location);
  if (data.linkedin) contactParts.push(data.linkedin.replace(/^https?:\/\//, ""));
  if (data.github) contactParts.push(data.github.replace(/^https?:\/\//, ""));

  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const contactLine = contactParts.join("  |  ");
    const wrappedContact = doc.splitTextToSize(contactLine, maxWidth);
    doc.text(wrappedContact, margin, y);
    y += wrappedContact.length * 11 + 6;
  }

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // 3. Professional Summary (if available)
  if (data.summary) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("RESUMEN PROFESIONAL", margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const summaryLines = doc.splitTextToSize(data.summary, maxWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 12 + 12;
  }

  // 4. Structured Sections or Raw Text Fallback
  if (data.sections && Object.keys(data.sections).length > 0) {
    for (const [secTitle, secContent] of Object.entries(data.sections)) {
      checkPageBreak(35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(secTitle.toUpperCase(), margin, y);
      y += 13;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);

      const items = Array.isArray(secContent) ? secContent : [secContent];
      for (const item of items) {
        if (!item || !item.trim()) continue;
        const isBullet = item.trim().startsWith("*") || item.trim().startsWith("-") || item.trim().startsWith("•");
        const cleanText = item.replace(/^[\*\-•]\s*/, "");

        checkPageBreak(20);
        if (isBullet) {
          doc.text("•", margin + 4, y);
          const bulletLines = doc.splitTextToSize(cleanText, maxWidth - 16);
          doc.text(bulletLines, margin + 16, y);
          y += bulletLines.length * 11.5 + 4;
        } else {
          const normalLines = doc.splitTextToSize(cleanText, maxWidth);
          doc.text(normalLines, margin, y);
          y += normalLines.length * 11.5 + 4;
        }
      }
      y += 8;
    }
  } else if (data.raw_text) {
    // Fallback: render raw_text line by line with ATS typography
    const lines = data.raw_text.split("\n");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 6;
        continue;
      }
      checkPageBreak(14);
      // Check if line is an uppercase section heading
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 35 && !trimmed.includes("|")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(trimmed, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
      } else {
        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 11.5 + 3;
      }
    }
  }

  const safeName = (data.full_name || data.title || "CV_ATS")
    .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/g, "_")
    .replace(/_+/g, "_");

  const filename = customFilename || `${safeName}_ATS.pdf`;
  doc.save(filename);
}

export function downloadClientDocx(data: ResumeExportData, customFilename?: string) {
  // Generate Microsoft Word-compatible HTML document with strict 0.5in margins and single-column layout
  const name = data.full_name || data.title || "Currículum Vitae";
  const contactParts: string[] = [];
  if (data.email) contactParts.push(data.email);
  if (data.phone) contactParts.push(data.phone);
  if (data.location) contactParts.push(data.location);
  if (data.linkedin) contactParts.push(data.linkedin);
  if (data.github) contactParts.push(data.github);

  let bodyHtml = `<h1 style="font-size: 18pt; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-weight: bold; text-transform: uppercase;">${name}</h1>`;
  if (contactParts.length > 0) {
    bodyHtml += `<p style="font-size: 9.5pt; color: #555555; margin: 4pt 0 10pt 0; font-family: Arial, Helvetica, sans-serif;">${contactParts.join(" | ")}</p>`;
  }
  bodyHtml += `<hr style="border: none; border-top: 1pt solid #cccccc; margin: 8pt 0 12pt 0;" />`;

  if (data.summary) {
    bodyHtml += `<h2 style="font-size: 11pt; font-family: Arial, Helvetica, sans-serif; margin: 10pt 0 4pt 0; font-weight: bold; text-transform: uppercase; color: #111111;">RESUMEN PROFESIONAL</h2>`;
    bodyHtml += `<p style="font-size: 10pt; line-height: 1.4; margin: 0 0 10pt 0; font-family: Arial, Helvetica, sans-serif;">${data.summary}</p>`;
  }

  if (data.sections) {
    for (const [secTitle, secContent] of Object.entries(data.sections)) {
      bodyHtml += `<h2 style="font-size: 11pt; font-family: Arial, Helvetica, sans-serif; margin: 12pt 0 4pt 0; font-weight: bold; text-transform: uppercase; color: #111111;">${secTitle}</h2>`;
      const items = Array.isArray(secContent) ? secContent : [secContent];
      bodyHtml += `<ul style="margin: 0 0 10pt 16pt; padding: 0; font-size: 10pt; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;">`;
      for (const item of items) {
        if (!item || !item.trim()) continue;
        const clean = item.replace(/^[\*\-•]\s*/, "");
        bodyHtml += `<li style="margin-bottom: 3pt;">${clean}</li>`;
      }
      bodyHtml += `</ul>`;
    }
  } else if (data.raw_text) {
    bodyHtml += `<pre style="font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; white-space: pre-wrap; line-height: 1.4;">${data.raw_text}</pre>`;
  }

  const wordDoc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${name}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 1.27cm 1.27cm 1.27cm 1.27cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111111;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + wordDoc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (data.full_name || data.title || "CV_ATS")
    .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/g, "_")
    .replace(/_+/g, "_");
  a.download = customFilename || `${safeName}_ATS.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadClientTxt(data: ResumeExportData, customFilename?: string) {
  let content = data.raw_text || "";
  if (!content) {
    const parts = [
      (data.full_name || data.title || "").toUpperCase(),
      [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join(" | "),
      "--------------------------------------------------",
    ];
    if (data.summary) {
      parts.push("\nRESUMEN PROFESIONAL\n" + data.summary);
    }
    if (data.sections) {
      for (const [title, items] of Object.entries(data.sections)) {
        parts.push(`\n${title.toUpperCase()}`);
        const it = Array.isArray(items) ? items : [items];
        for (const item of it) {
          parts.push(`* ${item.replace(/^[\*\-•]\s*/, "")}`);
        }
      }
    }
    content = parts.join("\n");
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (data.full_name || data.title || "CV_ATS")
    .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/g, "_")
    .replace(/_+/g, "_");
  a.download = customFilename || `${safeName}_ATS.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

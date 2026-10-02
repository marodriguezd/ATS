import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

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
    const cleanRaw = data.raw_text.replace(/^===.*?===\n?/gm, "").trim();
    const lines = cleanRaw.split("\n");
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
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 3 &&
        trimmed.length < 35 &&
        !trimmed.includes("|") &&
        !trimmed.includes("@")
      ) {
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

export async function downloadClientDocx(data: ResumeExportData, customFilename?: string) {
  const docParagraphs: Paragraph[] = [];

  // 1. Header: Full Name
  const name = (data.full_name || data.title || "CURRICULUM VITAE").toUpperCase();
  docParagraphs.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: name,
          bold: true,
          size: 32, // 16pt
          font: "Arial",
          color: "111111",
        }),
      ],
    })
  );

  // 2. Contact Information
  const contactParts: string[] = [];
  if (data.email) contactParts.push(data.email);
  if (data.phone) contactParts.push(data.phone);
  if (data.location) contactParts.push(data.location);
  if (data.linkedin) contactParts.push(data.linkedin.replace(/^https?:\/\//, ""));
  if (data.github) contactParts.push(data.github.replace(/^https?:\/\//, ""));

  if (contactParts.length > 0) {
    docParagraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactParts.join("  |  "),
            size: 19, // 9.5pt
            font: "Arial",
            color: "555555",
          }),
        ],
      })
    );
  }

  // 3. Summary
  if (data.summary) {
    docParagraphs.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: "RESUMEN PROFESIONAL",
            bold: true,
            size: 22, // 11pt
            font: "Arial",
            color: "111111",
          }),
        ],
      })
    );
    docParagraphs.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: data.summary,
            size: 20, // 10pt
            font: "Arial",
            color: "333333",
          }),
        ],
      })
    );
  }

  // 4. Sections
  if (data.sections && Object.keys(data.sections).length > 0) {
    for (const [secTitle, secContent] of Object.entries(data.sections)) {
      docParagraphs.push(
        new Paragraph({
          spacing: { before: 220, after: 80 },
          children: [
            new TextRun({
              text: secTitle.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: "Arial",
              color: "111111",
            }),
          ],
        })
      );

      const items = Array.isArray(secContent) ? secContent : [secContent];
      for (const item of items) {
        if (!item || !item.trim()) continue;
        const isBullet = item.trim().startsWith("*") || item.trim().startsWith("-") || item.trim().startsWith("•");
        const cleanText = item.replace(/^[\*\-•]\s*/, "");

        if (isBullet) {
          docParagraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: cleanText,
                  size: 20,
                  font: "Arial",
                  color: "333333",
                }),
              ],
            })
          );
        } else {
          docParagraphs.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({
                  text: cleanText,
                  size: 20,
                  font: "Arial",
                  color: "333333",
                }),
              ],
            })
          );
        }
      }
    }
  } else if (data.raw_text) {
    const cleanRaw = data.raw_text.replace(/^===.*?===\n?/gm, "").trim();
    const lines = cleanRaw.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const isHeading =
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 3 &&
        trimmed.length < 35 &&
        !trimmed.includes("|") &&
        !trimmed.includes("@");

      if (isHeading) {
        docParagraphs.push(
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [
              new TextRun({
                text: trimmed,
                bold: true,
                size: 22,
                font: "Arial",
                color: "111111",
              }),
            ],
          })
        );
      } else if (trimmed.startsWith("*") || trimmed.startsWith("-") || trimmed.startsWith("•")) {
        docParagraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: trimmed.replace(/^[\*\-•]\s*/, ""),
                size: 20,
                font: "Arial",
                color: "333333",
              }),
            ],
          })
        );
      } else {
        docParagraphs.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: trimmed,
                size: 20,
                font: "Arial",
                color: "333333",
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: docParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (data.full_name || data.title || "CV_ATS")
    .replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/g, "_")
    .replace(/_+/g, "_");
  a.download = customFilename || `${safeName}_ATS.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadClientTxt(data: ResumeExportData, customFilename?: string) {
  let content = "";
  if (data.sections && Object.keys(data.sections).length > 0) {
    const parts: string[] = [
      (data.full_name || data.title || "CURRICULUM VITAE").toUpperCase(),
      [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join("  |  "),
      "--------------------------------------------------",
    ];
    if (data.summary) {
      parts.push("\nRESUMEN PROFESIONAL\n" + data.summary);
    }
    for (const [title, items] of Object.entries(data.sections)) {
      parts.push(`\n${title.toUpperCase()}`);
      const it = Array.isArray(items) ? items : [items];
      for (const item of it) {
        if (!item || !item.trim()) continue;
        const clean = item.replace(/^[\*\-•]\s*/, "");
        parts.push(`* ${clean}`);
      }
    }
    content = parts.join("\n");
  } else if (data.raw_text) {
    content = data.raw_text.replace(/^===.*?===\n?/gm, "").trim();
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

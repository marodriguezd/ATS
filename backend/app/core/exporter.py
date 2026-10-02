import io
from typing import Dict, Any, List
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ATSExporter:
    """
    Generates 100% ATS-Safe resumes:
    - Single-column layout
    - No tables, graphics, or text frames
    - Standard fonts (Helvetica, Times, Courier)
    - Sequential text stream (Name -> Contact -> Summary -> Experience -> Education -> Skills)
    """

    @classmethod
    def export_pdf(cls, cv_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # ATS Safe Styles
        name_style = ParagraphStyle(
            "ATS_Name",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#1A1A1A"),
            spaceAfter=4,
            alignment=1 # Center
        )

        contact_style = ParagraphStyle(
            "ATS_Contact",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#4A4A4A"),
            spaceAfter=10,
            alignment=1 # Center
        )

        heading_style = ParagraphStyle(
            "ATS_Heading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=3,
            keepWithNext=True
        )

        subheading_style = ParagraphStyle(
            "ATS_Subheading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#1E293B"),
            spaceBefore=4,
            spaceAfter=2,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            "ATS_Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155"),
            spaceAfter=4
        )

        bullet_style = ParagraphStyle(
            "ATS_Bullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor("#334155"),
            leftIndent=14,
            firstLineIndent=-10,
            spaceAfter=3
        )

        story = []

        # 1. Name
        full_name = cv_data.get("full_name", "Nombre Completo")
        story.append(Paragraph(full_name, name_style))

        # 2. Contact details (in the main stream, NOT in header/footer)
        contact_items = []
        if cv_data.get("email"):
            contact_items.append(cv_data["email"])
        if cv_data.get("phone"):
            contact_items.append(cv_data["phone"])
        if cv_data.get("location"):
            contact_items.append(cv_data["location"])
        if cv_data.get("linkedin"):
            contact_items.append(cv_data["linkedin"])
        if cv_data.get("github"):
            contact_items.append(cv_data["github"])

        contact_line = " | ".join(contact_items)
        story.append(Paragraph(contact_line, contact_style))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

        # 3. Professional Summary
        summary = cv_data.get("summary", "")
        if summary:
            story.append(Paragraph("PROFESSIONAL SUMMARY", heading_style))
            story.append(Paragraph(summary, body_style))
            story.append(Spacer(1, 4))

        # 4. Work Experience
        experiences = cv_data.get("experience", [])
        if experiences:
            story.append(Paragraph("WORK EXPERIENCE", heading_style))
            for exp in experiences:
                role = exp.get("role", "")
                company = exp.get("company", "")
                dates = exp.get("dates", "")
                loc = exp.get("location", "")

                header_parts = [f"<b>{role}</b>", company]
                if loc:
                    header_parts.append(loc)
                if dates:
                    header_parts.append(f"<i>({dates})</i>")

                story.append(Paragraph(" | ".join(filter(None, header_parts)), subheading_style))

                bullets = exp.get("bullets", [])
                for b in bullets:
                    story.append(Paragraph(f"&bull; {b}", bullet_style))
                story.append(Spacer(1, 4))

        # 5. Skills
        skills = cv_data.get("skills", [])
        if skills:
            story.append(Paragraph("TECHNICAL & PROFESSIONAL SKILLS", heading_style))
            if isinstance(skills, list):
                skills_text = ", ".join(skills)
            else:
                skills_text = str(skills)
            story.append(Paragraph(skills_text, body_style))
            story.append(Spacer(1, 4))

        # 6. Education
        education = cv_data.get("education", [])
        if education:
            story.append(Paragraph("EDUCATION", heading_style))
            for edu in education:
                degree = edu.get("degree", "")
                institution = edu.get("institution", "")
                year = edu.get("year", "")
                edu_parts = [f"<b>{degree}</b>", institution]
                if year:
                    edu_parts.append(str(year))
                story.append(Paragraph(" | ".join(filter(None, edu_parts)), subheading_style))
                if edu.get("notes"):
                    story.append(Paragraph(f"&bull; {edu['notes']}", bullet_style))
            story.append(Spacer(1, 4))

        # 7. Certifications (if any)
        certs = cv_data.get("certifications", [])
        if certs:
            story.append(Paragraph("CERTIFICATIONS", heading_style))
            for cert in certs:
                story.append(Paragraph(f"&bull; {cert}", bullet_style))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def export_docx(cls, cv_data: Dict[str, Any]) -> bytes:
        doc = Document()

        # Set 0.5 inch margins (standard ATS)
        for section in doc.sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

        # Name
        h1 = doc.add_paragraph()
        run = h1.add_run(cv_data.get("full_name", "Nombre Completo"))
        run.font.name = "Arial"
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = RGBColor(26, 26, 26)

        # Contact
        contact_items = []
        for field in ["email", "phone", "location", "linkedin", "github"]:
            if cv_data.get(field):
                contact_items.append(cv_data[field])

        if contact_items:
            p_contact = doc.add_paragraph(" | ".join(contact_items))
            if p_contact.runs:
                p_contact.runs[0].font.name = "Arial"
                p_contact.runs[0].font.size = Pt(9.5)
                p_contact.runs[0].font.color.rgb = RGBColor(80, 80, 80)

        # Summary
        if cv_data.get("summary"):
            cls._add_docx_section_heading(doc, "PROFESSIONAL SUMMARY")
            p = doc.add_paragraph(cv_data["summary"])
            p.runs[0].font.name = "Arial"
            p.runs[0].font.size = Pt(10)

        # Experience
        if cv_data.get("experience"):
            cls._add_docx_section_heading(doc, "WORK EXPERIENCE")
            for exp in cv_data["experience"]:
                p_role = doc.add_paragraph()
                r_title = p_role.add_run(f"{exp.get('role', '')} — {exp.get('company', '')}")
                r_title.bold = True
                r_title.font.name = "Arial"
                r_title.font.size = Pt(10.5)
                if exp.get("dates"):
                    r_dates = p_role.add_run(f" ({exp.get('dates')})")
                    r_dates.italic = True
                    r_dates.font.name = "Arial"
                    r_dates.font.size = Pt(10)

                for bullet in exp.get("bullets", []):
                    bp = doc.add_paragraph(bullet, style='List Bullet')
                    bp.runs[0].font.name = "Arial"
                    bp.runs[0].font.size = Pt(9.5)

        # Skills
        if cv_data.get("skills"):
            cls._add_docx_section_heading(doc, "TECHNICAL & PROFESSIONAL SKILLS")
            skills_val = cv_data["skills"]
            text = ", ".join(skills_val) if isinstance(skills_val, list) else str(skills_val)
            p = doc.add_paragraph(text)
            p.runs[0].font.name = "Arial"
            p.runs[0].font.size = Pt(10)

        # Education
        if cv_data.get("education"):
            cls._add_docx_section_heading(doc, "EDUCATION")
            for edu in cv_data["education"]:
                p = doc.add_paragraph()
                r = p.add_run(f"{edu.get('degree', '')} — {edu.get('institution', '')}")
                r.bold = True
                r.font.name = "Arial"
                r.font.size = Pt(10)
                if edu.get("year"):
                    p.add_run(f" ({edu.get('year')})")

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def export_text(cls, cv_data: Dict[str, Any]) -> str:
        lines = []
        lines.append(cv_data.get("full_name", "").upper())
        contact_items = [cv_data.get(k) for k in ["email", "phone", "location", "linkedin", "github"] if cv_data.get(k)]
        lines.append(" | ".join(contact_items))
        lines.append("-" * 50)

        if cv_data.get("summary"):
            lines.append("\nPROFESSIONAL SUMMARY")
            lines.append(cv_data["summary"])

        if cv_data.get("experience"):
            lines.append("\nWORK EXPERIENCE")
            for exp in cv_data["experience"]:
                lines.append(f"{exp.get('role', '')} | {exp.get('company', '')} | {exp.get('dates', '')}")
                for b in exp.get("bullets", []):
                    lines.append(f"  * {b}")

        if cv_data.get("skills"):
            lines.append("\nTECHNICAL SKILLS")
            skills_val = cv_data["skills"]
            lines.append(", ".join(skills_val) if isinstance(skills_val, list) else str(skills_val))

        if cv_data.get("education"):
            lines.append("\nEDUCATION")
            for edu in cv_data["education"]:
                lines.append(f"{edu.get('degree', '')} - {edu.get('institution', '')} ({edu.get('year', '')})")

        return "\n".join(lines)

    @classmethod
    def _add_docx_section_heading(cls, doc: Document, text: str):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.bold = True
        run.font.name = "Arial"
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(15, 23, 42)

import re
import io
from typing import Dict, Any, List, Optional
import pdfplumber
import pypdf
import docx

from app.core.column_untangler import ColumnUntangler

class ATSParser:
    """
    Simulates real ATS parsing engines (Workday, Taleo, Greenhouse, iCIMS).
    Detects structural obstacles: multi-columns, tables, graphics, non-standard fonts.
    """

    STANDARD_SECTION_PATTERNS = {
        "experience": r"(?i).*\b(experience|employment|historial\s+laboral|experiencia|proyectos)\b.*",
        "education": r"(?i).*\b(education|academic|estudios|formaci[oó]n|educaci[oó]n)\b.*",
        "skills": r"(?i).*\b(skills|competencies|habilidades|competencias|tecnolog[ií]as|conocimientos)\b.*",
        "summary": r"(?i).*\b(summary|about\s+me|profile|perfil|extracto|resumen)\b.*",
        "certifications": r"(?i).*\b(certifications|courses|certificaciones|cursos|licencias)\b.*",
        "projects": r"(?i).*\b(projects|proyectos)\b.*",
        "languages": r"(?i).*\b(languages|idiomas)\b.*",
    }

    EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_REGEX = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}"
    LINKEDIN_REGEX = r"(?:linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9_-]+)|linkedin\.com\/[a-zA-Z0-9_-]+)"
    GITHUB_REGEX = r"(?:github\.com\/([a-zA-Z0-9_-]+))"

    @classmethod
    def parse_pdf(cls, file_bytes: bytes) -> Dict[str, Any]:
        naive_text_pages = []
        untangled_text_pages = []
        formatting_issues = []
        is_multi_column = False
        has_tables = False
        total_pages = 0

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                total_pages = len(pdf.pages)
                for page_idx, page in enumerate(pdf.pages):
                    # Check for tables
                    tables = page.find_tables()
                    if tables:
                        has_tables = True
                        formatting_issues.append({
                            "type": "table_detected",
                            "severity": "high",
                            "message": f"Página {page_idx + 1}: Se detectaron tablas. Muchos ATS fallan al asociar el texto de las celdas en el orden correcto.",
                            "page": page_idx + 1
                        })

                    # Run spatial column untangler
                    p_naive, p_untangled, p_is_multi, _ = ColumnUntangler.untangle_page(page)
                    if p_is_multi:
                        is_multi_column = True
                        formatting_issues.append({
                            "type": "multi_column_detected",
                            "severity": "high",
                            "message": f"Página {page_idx + 1}: Posible diseño a doble columna. Los parsers ATS suelen mezclar el texto de izquierda a derecha de forma incoherente.",
                            "page": page_idx + 1
                        })

                    naive_text_pages.append(p_naive)
                    untangled_text_pages.append(p_untangled)

        except Exception as e:
            # Fallback to pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            total_pages = len(reader.pages)
            for page in reader.pages:
                t = (page.extract_text() or "").replace("(cid:127)", "• ")
                naive_text_pages.append(t)
                untangled_text_pages.append(t)
            formatting_issues.append({
                "type": "parser_warning",
                "severity": "medium",
                "message": f"Lectura asistida por fallback: {str(e)}"
            })

        full_naive_text = "\n\n".join(naive_text_pages)
        full_untangled_text = "\n\n".join(untangled_text_pages)
        effective_text = full_untangled_text if is_multi_column else full_naive_text

        # Check total pages length
        if total_pages > 2:
            formatting_issues.append({
                "type": "length_warning",
                "severity": "medium",
                "message": f"Tu CV tiene {total_pages} páginas. Se recomienda mantenerlo en 1 o máximo 2 páginas para candidatos senior.",
                "page": total_pages
            })

        # Structured parsing using spatially untangled text
        parsed_sections = cls._extract_sections(effective_text)
        contact_info = cls._extract_contact_info(effective_text)

        # Contact check
        if not contact_info.get("email"):
            formatting_issues.append({
                "type": "contact_missing",
                "severity": "high",
                "message": "No se detectó un correo electrónico accesible por texto plano. El ATS descartará tu perfil si no puede contactarte."
            })
        if not contact_info.get("phone"):
            formatting_issues.append({
                "type": "contact_warning",
                "severity": "medium",
                "message": "No se detectó número de teléfono en texto plano."
            })

        return {
            "raw_text": effective_text,
            "raw_ats_view": full_naive_text.strip(),
            "untangled_view": full_untangled_text.strip(),
            "total_pages": total_pages,
            "is_multi_column": is_multi_column,
            "has_tables": has_tables,
            "contact_info": contact_info,
            "sections": parsed_sections,
            "formatting_issues": formatting_issues
        }

    @classmethod
    def parse_docx(cls, file_bytes: bytes) -> Dict[str, Any]:
        formatting_issues = []
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        full_raw_text = "\n".join(paragraphs)

        has_tables = len(doc.tables) > 0
        if has_tables:
            formatting_issues.append({
                "type": "table_detected",
                "severity": "medium",
                "message": "El documento contiene tablas de Word. Aunque DOCX es legible por ATS, las tablas complejas pueden perder jerarquía."
            })
            # Also extract table text into raw text
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                    if row_text:
                        full_raw_text += f"\n{row_text}"

        parsed_sections = cls._extract_sections(full_raw_text)
        contact_info = cls._extract_contact_info(full_raw_text)

        return {
            "raw_text": full_raw_text,
            "raw_ats_view": full_raw_text.strip(),
            "total_pages": 1,
            "is_multi_column": False,
            "has_tables": has_tables,
            "contact_info": contact_info,
            "sections": parsed_sections,
            "formatting_issues": formatting_issues
        }

    @classmethod
    def parse_plain_text(cls, text: str) -> Dict[str, Any]:
        return {
            "raw_text": text,
            "raw_ats_view": text.strip(),
            "total_pages": 1,
            "is_multi_column": False,
            "has_tables": False,
            "contact_info": cls._extract_contact_info(text),
            "sections": cls._extract_sections(text),
            "formatting_issues": []
        }

    @classmethod
    def _extract_contact_info(cls, text: str) -> Dict[str, Optional[str]]:
        emails = re.findall(cls.EMAIL_REGEX, text)
        phones = re.findall(cls.PHONE_REGEX, text)
        linkedins = re.findall(cls.LINKEDIN_REGEX, text)
        githubs = re.findall(cls.GITHUB_REGEX, text)

        # Clean phones
        valid_phone = None
        for p in phones:
            cleaned = re.sub(r"[^\d+]", "", p)
            if len(cleaned) >= 8:
                valid_phone = p.strip()
                break

        return {
            "email": emails[0] if emails else None,
            "phone": valid_phone,
            "linkedin": linkedins[0] if linkedins else None,
            "github": githubs[0] if githubs else None
        }

    @classmethod
    def _extract_sections(cls, text: str) -> Dict[str, str]:
        lines = text.split("\n")
        detected_indices = []

        for i, line in enumerate(lines):
            trimmed = line.strip()
            if not trimmed or len(trimmed) > 40:
                continue

            for section_name, pattern in cls.STANDARD_SECTION_PATTERNS.items():
                if re.fullmatch(pattern, trimmed):
                    detected_indices.append((i, section_name))
                    break

        sections = {}
        for idx, (line_num, sec_name) in enumerate(detected_indices):
            start = line_num + 1
            end = detected_indices[idx + 1][0] if idx + 1 < len(detected_indices) else len(lines)
            content = "\n".join(lines[start:end]).strip()
            sections[sec_name] = content

        return sections

from typing import List, Dict, Any, Tuple
import pdfplumber

class ColumnUntangler:
    """
    Spatially analyzes PDF word coordinates to detect and untangle multi-column layouts.
    Provides:
    1. naive_text: Horizontally interleaved stream (what primitive ATS engines read).
    2. untangled_text: True column-by-column semantic sequence.
    3. column_regions: Coordinates of detected columns.
    """

    @classmethod
    def untangle_page(cls, page: pdfplumber.page.Page) -> Tuple[str, str, bool, List[Dict[str, float]]]:
        words = page.extract_words()
        if not words:
            return "", "", False, []

        page_width = page.width
        page_height = page.height
        mid_x = page_width / 2

        # 1. Naive extraction: standard line-by-line reading
        naive_text = (page.extract_text(layout=False) or "").replace("(cid:127)", "• ")

        # 2. Check if page has header spanning across width (e.g. Name, title)
        header_y_threshold = 120 # Top header region
        footer_y_threshold = page_height - 60

        header_words = [w for w in words if w["top"] < header_y_threshold]
        body_words = [w for w in words if header_y_threshold <= w["top"] <= footer_y_threshold]
        footer_words = [w for w in words if w["top"] > footer_y_threshold]

        # Analyze body for columns
        left_body = [w for w in body_words if w["x1"] < mid_x - 15]
        right_body = [w for w in body_words if w["x0"] > mid_x + 15]
        center_crossing_body = [w for w in body_words if w["x0"] < mid_x < w["x1"]]
        gutter_words = [w for w in body_words if (mid_x - 20) <= ((w["x0"] + w["x1"]) / 2) <= (mid_x + 20)]

        is_multi_column = (
            len(left_body) > 25 and
            len(right_body) > 25 and
            len(center_crossing_body) < 3 and
            len(gutter_words) < 5
        )

        if not is_multi_column:
            # Single column layout: return standard extraction
            return naive_text, naive_text, False, [{"x0": 0, "x1": page_width}]

        # It IS multi-column! Perform spatial untangling:
        # Group words by region:
        # Region 0: Header (full width)
        # Region 1: Left Column (or sidebar)
        # Region 2: Right Column (or main content)
        # Region 3: Footer (full width)

        def sort_words_vertically(w_list):
            # Sort primarily by vertical Y, grouping words on the same line (within 3pt difference)
            if not w_list:
                return ""
            sorted_w = sorted(w_list, key=lambda w: (round(w["top"] / 4.0), w["x0"]))
            lines = []
            curr_y = None
            curr_line = []
            for w in sorted_w:
                line_key = round(w["top"] / 4.0)
                if curr_y is None or line_key == curr_y:
                    curr_line.append(w["text"])
                    curr_y = line_key
                else:
                    lines.append(" ".join(curr_line))
                    curr_line = [w["text"]]
                    curr_y = line_key
            if curr_line:
                lines.append(" ".join(curr_line))
            return "\n".join(lines)

        header_str = sort_words_vertically(header_words)
        left_str = sort_words_vertically(left_body)
        right_str = sort_words_vertically(right_body)
        footer_str = sort_words_vertically(footer_words)

        # Assemble untangled text logically
        # If right column has significantly more words, it's typically the main content (Experience/Summary)
        # We put Header -> Left Column -> Right Column -> Footer
        sections = [s for s in [header_str, left_str, right_str, footer_str] if s.strip()]
        untangled_text = "\n\n".join(sections)

        column_regions = [
            {"name": "Columna Izquierda", "x0": 0, "x1": mid_x - 15},
            {"name": "Columna Derecha", "x0": mid_x + 15, "x1": page_width},
        ]

        return naive_text, untangled_text, True, column_regions

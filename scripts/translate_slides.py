#!/usr/bin/env python3
"""
Unified Study Platform — Cloud Slide Sync & Google-Lens Arabic Image Translator
--------------------------------------------------------------------------------
1. Syncs original slide images (public/slides/**) directly to Cloudflare R2
   (cloud-to-cloud from GitHub Actions — zero local bandwidth required).
2. Translates foreign-language slides into Arabic overlay images (*.ar.webp)
   using Google Lens (chrome-lens-py) + the proven 2-pass clean renderer
   adapted from Smart-Screen-Translator-PC/translator_service.py.
   - Strictly online Google Lens ONLY (no local Argos/RapidOCR).
   - Smart Foreign-Language Gate: skips Arabic-only subjects & Arabic-only slides.
   - Academic Guard: skips mathematical formulas (FORMULA) and code blocks.
   - Incremental SHA-256 manifest (slides/translation-manifest.json on R2) so
     interrupted runs resume cleanly and unchanged slides are never re-processed.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import io
import json
import math
import os
import random
import re
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT / "public" / "slides"
SUBJECTS_JSON = ROOT / "public" / "data" / "subjects.json"
MANIFEST_KEY = "slides/translation-manifest.json"
RENDER_VERSION = 2
IMAGE_EXTS = {".webp", ".png", ".jpg", ".jpeg"}

# ------------------------------------------------------------------------------
# Linux / Cross-Platform Arabic Font Discovery (IBM Plex Sans Arabic / Cairo)
# ------------------------------------------------------------------------------
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/ibm-plex/IBMPlexSansArabic-Medium.ttf",
    "/usr/share/fonts/truetype/tajawal/Tajawal-Medium.ttf",
    "/usr/share/fonts/truetype/cairo/Cairo-SemiBold.ttf",
    "/usr/share/fonts/truetype/cairo/Cairo-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Medium.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
]


def find_arabic_font() -> Optional[str]:
    env_font = os.environ.get("SLIDE_ARABIC_FONT")
    if env_font and os.path.exists(env_font):
        return env_font
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


# ------------------------------------------------------------------------------
# Clean Google Lens Renderer Patches (Online Only — Zero Offline Fallback)
# Adapted from Smart-Screen-Translator-PC/translator_service.py + Book/Slide Polish
# ------------------------------------------------------------------------------
# Only match UNAMBIGUOUS programming code — NEVER plain English prose like "for some n..."
_CODE_LINE_RE = re.compile(
    r"(^\s*(def\s+[A-Za-z_]\w*\s*\(|class\s+[A-Za-z_]\w*\s*[\(:{]|#include\s*[<\"']|import\s+[A-Za-z_][\w.]*|from\s+[A-Za-z_][\w.]*\s+import\b|public\s+(?:static\s+)?(?:void|int|class|String)\b|SELECT\s+.+\s+FROM\b|CREATE\s+TABLE\b))"
    r"|(\b[a-zA-Z_][a-zA-Z0-9_]*\([^)]{0,40}\)\s*[{;])"
    r"|(::|=>|!==|===|&&|\|\||\b0x[0-9a-fA-F]+\b)",
    re.MULTILINE,
)
_MATH_SYMBOL_RE = re.compile(r"[∑∫∏√∞≈≠≤≥∈∉⊂⊃∪∩∀∃⇒⇔→←↔⊗⊕⟨⟩ψφλδΣΓΩ]|\\(frac|sum|int|alpha|beta|ket|bra)")
# Strip invisible Unicode BiDi/format control marks that render as tofu boxes (□) in FreeType
_BIDI_CTRL_RE = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]")


def _sample_canvas_colors(canvas: Image.Image, x1: int, y1: int, x2: int, y2: int):
    w, h = canvas.size
    bx1, by1 = max(0, x1 - 3), max(0, y1 - 3)
    bx2, by2 = min(w, x2 + 3), min(h, y2 + 3)

    ring_samples = []
    rgb = canvas.convert("RGB")
    if by1 < y1:
        ring_samples.append(rgb.crop((bx1, by1, bx2, y1)))
    if y2 < by2:
        ring_samples.append(rgb.crop((bx1, y2, bx2, by2)))
    if bx1 < x1:
        ring_samples.append(rgb.crop((bx1, max(0, y1), x1, min(h, y2))))
    if x2 < bx2:
        ring_samples.append(rgb.crop((x2, max(0, y1), bx2, min(h, y2))))

    bg_rgb = None
    max_std = 99.0
    if ring_samples:
        pixels = []
        for crop_im in ring_samples:
            pixels.extend(crop_im.getdata())
        if pixels:
            rs = sorted(p[0] for p in pixels)
            gs = sorted(p[1] for p in pixels)
            bs = sorted(p[2] for p in pixels)
            mid = len(pixels) // 2
            bg_rgb = (rs[mid], gs[mid], bs[mid])
            n = len(pixels)
            mean_r = sum(rs) / n
            mean_g = sum(gs) / n
            mean_b = sum(bs) / n
            var_r = sum((v - mean_r) ** 2 for v in rs) / n
            var_g = sum((v - mean_g) ** 2 for v in gs) / n
            var_b = sum((v - mean_b) ** 2 for v in bs) / n
            max_std = max(var_r, var_g, var_b) ** 0.5

    if bg_rgb is None:
        bg_rgb = (255, 255, 255)
    lum = 0.299 * bg_rgb[0] + 0.587 * bg_rgb[1] + 0.114 * bg_rgb[2]
    fg_rgb = (15, 15, 15) if lum > 135 else (245, 245, 245)
    return bg_rgb + (255,), fg_rgb + (255,), max_std


def apply_clean_renderer_patches():
    """Applies high-fidelity upload + 2-pass clean rendering + academic formula/code guards."""
    import chrome_lens_py.api as lens_api
    import chrome_lens_py.constants as lens_const
    import chrome_lens_py.core.image_processor as lens_img_proc
    import chrome_lens_py.core.text_renderer as tr

    try:
        lens_const.DEFAULT_IMAGE_MAX_WIDTH = 3840
        lens_const.DEFAULT_IMAGE_MAX_HEIGHT = 3840
        lens_const.DEFAULT_IMAGE_MAX_AREA = 8500000
        lens_const.DEFAULT_IMAGE_JPEG_QUALITY = 92

        lens_img_proc.DEFAULT_IMAGE_MAX_WIDTH = 3840
        lens_img_proc.DEFAULT_IMAGE_MAX_HEIGHT = 3840
        lens_img_proc.DEFAULT_IMAGE_MAX_AREA = 8500000
        lens_img_proc.DEFAULT_IMAGE_JPEG_QUALITY = 92

        lens_img_proc.encode_image_for_api.__defaults__ = (
            92,
            lens_const.DEFAULT_IMAGE_WEBP_QUALITY,
            lens_const.DEFAULT_ALPHA_MODE,
        )
        lens_img_proc._resize_and_serialize_pil_image.__defaults__ = (92,)
        lens_img_proc.prepare_image.__defaults__ = (
            None,
            True,
            92,
            lens_const.DEFAULT_IMAGE_WEBP_QUALITY,
            lens_const.DEFAULT_ALPHA_MODE,
        )
    except Exception:
        pass

    def clean_draw_background(canvas, tline, box_w, box_h, cx, cy, deg, aspect) -> bool:
        bg_rgba = (255, 255, 255, 255)
        if tline.HasField("style") and tline.style.background_primary_color:
            bg_rgba = tr._argb_to_rgba(tline.style.background_primary_color)
            if bg_rgba[3] == 0:
                bg_rgba = (bg_rgba[0], bg_rgba[1], bg_rgba[2], 255)

        sampled_bg, _, border_std = _sample_canvas_colors(
            canvas,
            int(round(cx - box_w / 2.0)),
            int(round(cy - box_h / 2.0)),
            int(round(cx + box_w / 2.0)),
            int(round(cy + box_h / 2.0)),
        )
        if abs(deg) < 1.5 and border_std < 12.0:
            bg_rgba = sampled_bg

        is_bright = bg_rgba[0] > 195 and bg_rgba[1] > 195 and bg_rgba[2] > 195
        if is_bright and border_std < 14.0:
            fill = Image.new("RGBA", (max(1, round(box_w) + 6), max(1, round(box_h) + 4)), bg_rgba)
            tr._paste_rotated(canvas, fill, cx, cy, deg)
            return False

        if tline.HasField("background_image_data"):
            try:
                bgd = tline.background_image_data
                pad_w = bgd.horizontal_padding * box_h / aspect
                pad_h = bgd.vertical_padding * box_h
                patch_w = max(1, round(box_w + pad_w))
                patch_h = max(1, round(box_h + pad_h))
                patch = Image.open(io.BytesIO(bgd.background_image)).convert("RGBA")

                stat = ImageStat.Stat(patch.convert("RGB"))
                if max(stat.stddev) < 14.0:
                    fill = Image.new("RGBA", (max(1, round(box_w) + 6), max(1, round(box_h) + 4)), bg_rgba)
                    tr._paste_rotated(canvas, fill, cx, cy, deg)
                    return False

                patch = patch.resize((patch_w, patch_h), Image.Resampling.BILINEAR)
                tr._paste_rotated(canvas, patch, cx, cy, deg)
                return True
            except Exception:
                pass

        fill = Image.new("RGBA", (max(1, round(box_w) + 6), max(1, round(box_h) + 4)), bg_rgba)
        tr._paste_rotated(canvas, fill, cx, cy, deg)
        return False

    orig_shape_for_display = tr.shape_for_display

    def clean_shape_for_display(text: str, is_rtl: bool) -> str:
        # Remove invisible BiDi control characters (LRM/RLM/LRE/PDF/etc.) before shaping
        # so Pillow/FreeType never paints ugly tofu boxes (□) around numbers or dashes.
        cleaned = _BIDI_CTRL_RE.sub("", text or "")
        cleaned = cleaned.replace("\u00a0", " ")
        shaped = orig_shape_for_display(cleaned, is_rtl)
        return _BIDI_CTRL_RE.sub("", shaped)

    def visual_fit_font_size(text: str, font, box_width: float, box_height: float):
        """
        Fits Arabic/Latin fonts by visual ink height rather than oversized Arabic em-box
        (ascent + descent on Noto/IBM Plex is ~1.7x-2.1x visual glyph height), keeping
        translated Arabic typography the same comfortable reading size as original English.
        """
        plan = tr._as_plan(font)
        low, high = tr.RENDER_MIN_FONT_SIZE, tr.RENDER_MAX_FONT_SIZE
        # Effective vertical capacity: match visual glyph height to source line box
        # while compensating slightly for IBM Plex/Noto Arabic metrics without touching adjacent lines.
        max_em_h = max(box_height * 1.24, box_height + 2.0)
        max_w = max(4.0, box_width * 0.995)
        while low <= high:
            mid = (low + high) // 2
            sized = plan.at(mid)
            ascent, descent = sized.getmetrics()
            if sized.getlength(text) >= max_w or (ascent + descent) >= max_em_h:
                high = mid - 1
            else:
                low = mid + 1
        size = max(tr.RENDER_MIN_FONT_SIZE, min(low - 1, tr.RENDER_MAX_FONT_SIZE))
        return plan.at(size), size

    def layout_preserving_alignment(scene, data, is_rtl: bool) -> str:
        if scene.text_align != "auto":
            return scene.text_align
        align = tr._ALIGNMENT.get(data.alignment, "left")
        # For Arabic/RTL translations, naturally right-align body paragraphs instead of
        # pinning them to the left margin (keeps centered titles centered).
        if is_rtl and align == "left":
            return "right"
        return align

    def safe_render_text_block(lines, font, box_w, box_h, fill, outline, outline_color, align, grow=False):
        ascent, descent = font.getmetrics()
        em = ascent + descent
        tile_w, tile_h = max(1, round(box_w)), max(1, round(box_h))
        ox = oy = 0.0
        edge = 2 * outline + 2
        if grow:
            widest = max((font.getlength(line) for line in lines), default=0.0)
            need_w, need_h = math.ceil(widest) + edge, len(lines) * em + edge
            if need_w > tile_w:
                if align in ("left", "right"):
                    tile_w = max(need_w, math.ceil(2.0 * (widest + edge) - box_w))
                    ox = (tile_w - box_w) / 2.0
                else:
                    tile_w = need_w
                    ox = (tile_w - box_w) / 2.0
            if need_h > tile_h:
                tile_h = need_h
                oy = (tile_h - box_h) / 2.0

        tile = Image.new("RGBA", (tile_w, tile_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(tile)
        y = oy + (box_h - len(lines) * em) / 2
        for line in lines:
            advance = font.getlength(line)
            if grow and tile_w > round(box_w):
                if align == "center":
                    raw_x = (float(tile_w) - advance) / 2.0
                else:
                    raw_x = ox + tr._align_x(align, box_w, advance)
                draw_x = max(float(edge // 2), min(float(tile_w) - advance - edge // 2, raw_x))
            else:
                draw_x = ox + tr._align_x(align, box_w, advance)
            font.draw(
                draw,
                (draw_x, y),
                line,
                fill,
                stroke_width=outline if outline_color else 0,
                stroke_fill=outline_color,
            )
            y += em
        return tile

    def safe_paste_rotated(canvas: Image.Image, tile: Image.Image, cx: float, cy: float, deg: float):
        if deg:
            tile = tile.rotate(deg, expand=True, resample=Image.Resampling.BICUBIC)
        px = round(cx - tile.width / 2)
        py = round(cy - tile.height / 2)
        bbox = tile.getbbox()
        if bbox is not None:
            c_left, c_top, c_right, c_bot = bbox
            if c_right - c_left <= canvas.width - 4:
                if px + c_right > canvas.width - 2:
                    px = (canvas.width - 2) - c_right
                if px + c_left < 2:
                    px = 2 - c_left
            if c_bot - c_top <= canvas.height - 4:
                if py + c_bot > canvas.height - 2:
                    py = (canvas.height - 2) - c_bot
                if py + c_top < 2:
                    py = 2 - c_top
        tr.composite(canvas, tile, px, py)

    orig_render_paragraph = tr._render_paragraph

    def _should_skip_source_paragraph(paragraph, data) -> bool:
        # 1. Skip Lens-detected mathematical formulas (word.type == FORMULA = 2)
        total_words = 0
        formula_words = 0
        for ln in paragraph.lines:
            for w in ln.words:
                total_words += 1
                if getattr(w, "type", 0) == 2:
                    formula_words += 1
        if total_words > 0 and (formula_words / total_words) >= 0.45:
            return True

        src_text = " ".join(
            "".join(w.plain_text + w.text_separator for w in ln.words).strip()
            for ln in paragraph.lines
        ).strip()
        if not src_text:
            return False

        tgt_base = (getattr(data, "target_language", "") or "").split("-")[0].lower()
        src_base = (getattr(data, "source_language", "") or "").split("-")[0].lower()

        # 2. Already Arabic (don't corrupt Arabic text on bilingual slides)
        if tgt_base == "ar" and any("\u0600" <= c <= "\u06FF" for c in src_text) and not re.search(r"[A-Za-z]{2,}", src_text):
            return True

        # 3. Pure numbers / short math variables / equations
        latin_words = re.findall(r"[A-Za-z]{3,}", src_text)
        if len(latin_words) == 0 and len(src_text) <= 24:
            return True
        if _MATH_SYMBOL_RE.search(src_text) and len(latin_words) <= 2:
            return True

        # 4. Unambiguous code snippets (only when short/code-dense, never normal English prose)
        if _CODE_LINE_RE.search(src_text) and len(latin_words) <= 14:
            return True

        # 5. Filenames / URLs
        if len(paragraph.lines) == 1 and re.search(
            r"\.(pdf|png|jpg|jpeg|webp|py|ts|tsx|js|json|html|css|exe|zip)\b", src_text, re.IGNORECASE
        ):
            return True

        # 6. Tiny UI/symbol noise
        alpha_only = re.sub(r"[^A-Za-z\u0600-\u06FF]+", "", src_text)
        major_langs = {"en", "ar", "fr", "es", "de", "tr", "ru", "zh", "ja", "it", "pt"}
        if len(alpha_only) <= 2 and (
            any(ch in src_text for ch in ("<", ">", "^", "|", "×"))
            or (src_base and src_base not in major_langs and src_base != tgt_base)
        ):
            return True

        return False

    def resilient_render_paragraph(scene, index: int, paragraph, data) -> int:
        if _should_skip_source_paragraph(paragraph, data):
            return 0

        if len(data.line) == len(paragraph.lines):
            vertical = data.writing_direction == tr._WRITING_DIRECTION_TOP_TO_BOTTOM
            use_hull = scene.draw_background and scene.erase_mode == "hull"
            if vertical or use_hull or len(data.line) <= 1 or not scene.draw_background:
                return orig_render_paragraph(scene, index, paragraph, data)

            is_rtl = (
                data.writing_direction == tr._WRITING_DIRECTION_RTL
                or data.target_language.split("-")[0].lower() in tr.RTL_LANGUAGES
            )
            align = tr._paragraph_alignment(scene, data, is_rtl)

            line_texts = []
            for li in range(len(data.line)):
                tline = data.line[li]
                next_line = data.line[li + 1] if li + 1 < len(data.line) else None
                line_texts.append(tr.build_line_text(data.translation, tline, next_line))

            inpainted = []
            for li in range(len(data.line)):
                tline = data.line[li]
                box = paragraph.lines[li].geometry.bounding_box
                box_w, box_h = box.width * scene.width, box.height * scene.height
                if box_w < 1 or box_h < 1:
                    inpainted.append(False)
                    continue
                deg = -math.degrees(box.rotation_z)
                cx, cy = box.center_x * scene.width, box.center_y * scene.height
                inpainted.append(
                    tr._draw_background(scene.canvas, tline, box_w, box_h, cx, cy, deg, scene.aspect)
                )

            non_empty_indices = [li for li, lt in enumerate(line_texts) if lt.strip()]
            use_para_block_rtl = (
                is_rtl
                and align == "right"
                and len(non_empty_indices) > 1
                and paragraph.HasField("geometry")
            )

            p_left_x = None
            p_right_x = None
            uniform_sizes = {}
            if use_para_block_rtl:
                pbox = paragraph.geometry.bounding_box
                p_left_x = (pbox.center_x - pbox.width / 2.0) * scene.width
                p_right_x = (pbox.center_x + pbox.width / 2.0) * scene.width
                para_w = max(12.0, p_right_x - p_left_x)

                # Compute median line height capped by actual vertical line pitch so lines never touch
                heights = sorted(
                    paragraph.lines[li].geometry.bounding_box.height * scene.height
                    for li in non_empty_indices
                    if paragraph.lines[li].geometry.bounding_box.height > 0
                )
                med_bh = heights[len(heights) // 2] if heights else 20.0
                cys = sorted(
                    paragraph.lines[li].geometry.bounding_box.center_y * scene.height
                    for li in non_empty_indices
                )
                pitches = [cys[i + 1] - cys[i] for i in range(len(cys) - 1) if cys[i + 1] - cys[i] > 4.0]
                max_safe_bh = min(pitches) * 0.88 if pitches else med_bh
                eff_bh = min(med_bh, max_safe_bh)

                line_infos = []
                for li in non_empty_indices:
                    box = paragraph.lines[li].geometry.bounding_box
                    bw, bh = box.width * scene.width, box.height * scene.height
                    deg = -math.degrees(box.rotation_z)
                    if bw < 1 or bh < 1 or abs(deg) >= 1.5:
                        continue
                    shaped = tr.shape_for_display(line_texts[li], is_rtl)
                    plan = tr.FontPlan.resolve(shaped, scene.font_path)
                    # Fit against the FULL paragraph width and pitch-safe line height
                    _, fsz = tr.fit_font_size(shaped, plan, para_w, min(max(bh, eff_bh), max_safe_bh))
                    fsz = max(scene.floor, fsz)
                    line_infos.append((li, shaped, plan, fsz))

                if line_infos:
                    # Target uniform paragraph font size = median (not min!) so one long line
                    # doesn't drag an entire 9-line book paragraph down to microscopic text.
                    sorted_fsz = sorted(info[3] for info in line_infos)
                    target_fsz = max(scene.floor, sorted_fsz[len(sorted_fsz) // 2])
                    for li, shaped, plan, line_max_fsz in line_infos:
                        # Shrink ONLY lines that genuinely overflow full paragraph width
                        fsz_i = min(target_fsz, line_max_fsz)
                        uniform_sizes[li] = (plan.at(fsz_i), fsz_i, shaped)

            drawn = 0
            for li in range(len(data.line)):
                tline = data.line[li]
                box = paragraph.lines[li].geometry.bounding_box
                box_w, box_h = box.width * scene.width, box.height * scene.height
                if box_w < 1 or box_h < 1:
                    continue
                text = line_texts[li]
                if not text.strip():
                    continue
                text = tr.shape_for_display(text, is_rtl)
                text_color = tr._argb_to_rgba(tline.style.text_color)
                outline_color = tr._argb_to_rgba(tline.style.background_primary_color) if inpainted[li] else None

                cx = box.center_x * scene.width
                cy = box.center_y * scene.height
                deg = -math.degrees(box.rotation_z)

                if use_para_block_rtl and abs(deg) < 1.5 and p_left_x is not None and p_right_x is not None and li in uniform_sizes:
                    sized, fsz, shaped_u = uniform_sizes[li]
                    avail_w = max(12.0, p_right_x - p_left_x)
                    cx = p_left_x + avail_w / 2.0
                    outline_w = tr.outline_px(fsz, scene.outline_scale) if outline_color else 0
                    tile = tr._render_line_tile(
                        shaped_u,
                        sized,
                        avail_w,
                        max(box_h, fsz * 1.35),
                        text_color,
                        outline_w,
                        outline_color,
                        "right",
                        grow=(sized.getlength(shaped_u) > avail_w),
                    )
                else:
                    plan = tr.FontPlan.resolve(text, scene.font_path)
                    tile = tr._render_horizontal(scene, text, plan, box_w, box_h, text_color, outline_color, align)

                tr._paste_rotated(scene.canvas, tile, cx, cy, deg)
                drawn += 1
            return drawn

        if not data.translation or not data.translation.strip():
            return 0

        is_rtl = (
            data.writing_direction == tr._WRITING_DIRECTION_RTL
            or data.target_language.split("-")[0].lower() in tr.RTL_LANGUAGES
        )
        align = tr._paragraph_alignment(scene, data, is_rtl)

        if scene.draw_background:
            if data.line:
                tr._erase_text_area(scene.canvas, paragraph, data, max(0.35, scene.hull_padding))
            else:
                for sline in paragraph.lines:
                    if not sline.HasField("geometry"):
                        continue
                    box = sline.geometry.bounding_box
                    bw, bh = box.width * scene.width, box.height * scene.height
                    if bw < 1 or bh < 1:
                        continue
                    sx1 = int(round(box.center_x * scene.width - bw / 2.0))
                    sy1 = int(round(box.center_y * scene.height - bh / 2.0))
                    sx2 = int(round(box.center_x * scene.width + bw / 2.0))
                    sy2 = int(round(box.center_y * scene.height + bh / 2.0))
                    bg_c, _, _ = _sample_canvas_colors(scene.canvas, sx1, sy1, sx2, sy2)
                    fill = Image.new("RGBA", (max(1, round(bw) + 4), max(1, round(bh) + 4)), bg_c)
                    tr._paste_rotated(
                        scene.canvas,
                        fill,
                        box.center_x * scene.width,
                        box.center_y * scene.height,
                        -math.degrees(box.rotation_z),
                    )

        if paragraph.HasField("geometry"):
            return tr._render_reflow_paragraph(scene, paragraph, data, align, is_rtl, use_hull=True)
        return 0

    tr.shape_for_display = clean_shape_for_display
    tr.fit_font_size = visual_fit_font_size
    tr._paragraph_alignment = layout_preserving_alignment
    tr._draw_background = clean_draw_background
    tr._render_text_block = safe_render_text_block
    tr._paste_rotated = safe_paste_rotated
    tr._render_paragraph = resilient_render_paragraph
    lens_api.render_translation_overlay = tr.render_translation_overlay


# ------------------------------------------------------------------------------
# Cloudflare R2 S3 Client Helpers
# ------------------------------------------------------------------------------
def make_r2_client() -> Tuple[Any, str, str]:
    import boto3
    from botocore.config import Config as BotoConfig

    account_id = os.environ["R2_ACCOUNT_ID"].strip()
    access_key = os.environ["R2_ACCESS_KEY_ID"].strip()
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"].strip()
    bucket = os.environ["R2_BUCKET"].strip()
    public_url = os.environ.get("R2_PUBLIC_URL", "").strip().rstrip("/")

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=BotoConfig(retries={"max_attempts": 4, "mode": "standard"}),
    )
    return client, bucket, public_url


def list_r2_etags(client: Any, bucket: str, prefix: str = "slides/") -> Dict[str, str]:
    etags: Dict[str, str] = {}
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            etags[obj["Key"]] = obj.get("ETag", "").strip('"')
    return etags


def load_manifest(client: Any, bucket: str, public_url: str) -> Dict[str, Any]:
    from botocore.exceptions import ClientError

    try:
        resp = client.get_object(Bucket=bucket, Key=MANIFEST_KEY)
        data = json.loads(resp["Body"].read().decode("utf-8"))
        if isinstance(data, dict) and isinstance(data.get("slides"), dict):
            data["r2_public_url"] = public_url
            return data
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code not in ("NoSuchKey", "404"):
            print(f"[Manifest] Warning reading existing manifest: {exc}")
    except Exception as exc:
        print(f"[Manifest] Warning parsing existing manifest: {exc}")

    return {
        "version": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "r2_public_url": public_url,
        "slides": {},
    }


def save_manifest(client: Any, bucket: str, manifest: Dict[str, Any]) -> None:
    manifest["render_version"] = RENDER_VERSION
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
    payload = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    client.put_object(
        Bucket=bucket,
        Key=MANIFEST_KEY,
        Body=payload,
        ContentType="application/json; charset=utf-8",
        CacheControl="public, max-age=300",
    )


def file_md5_sha256(path: Path) -> Tuple[str, str]:
    md5 = hashlib.md5()
    sha = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            md5.update(chunk)
            sha.update(chunk)
    return md5.hexdigest(), sha.hexdigest()


def content_type_for(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        ".webp": "image/webp",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(ext, "application/octet-stream")


def load_arabic_only_subjects() -> set[str]:
    if not SUBJECTS_JSON.exists():
        return set()
    try:
        items = json.loads(SUBJECTS_JSON.read_text(encoding="utf-8"))
        return {
            str(s["code"]).lower()
            for s in items
            if isinstance(s, dict) and (s.get("arabic_only") is True or s.get("source_language") == "ar")
        }
    except Exception:
        return set()


def discover_slides(subject_filter: Optional[str] = None) -> List[Path]:
    if not SLIDES_DIR.exists():
        return []
    files: List[Path] = []
    for p in sorted(SLIDES_DIR.rglob("*")):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        if p.name.endswith(".ar.webp"):
            continue
        rel = p.relative_to(SLIDES_DIR)
        subj = rel.parts[0].lower() if rel.parts else ""
        if subject_filter and subj != subject_filter.lower():
            continue
        files.append(p)
    return files


def to_r2_key(path: Path) -> str:
    return "slides/" + path.relative_to(SLIDES_DIR).as_posix()


def to_ar_key(orig_key: str) -> str:
    dot = orig_key.rfind(".")
    return (orig_key[:dot] if dot > 0 else orig_key) + ".ar.webp"


def is_predominantly_arabic(ocr_text: str, detected_lang: str) -> bool:
    lang_base = (detected_lang or "").split("-")[0].lower()
    ar_chars = len(re.findall(r"[\u0600-\u06FF]", ocr_text))
    latin_chars = len(re.findall(r"[A-Za-z]", ocr_text))
    latin_words = re.findall(r"[A-Za-z]{3,}", ocr_text)
    total_alpha = ar_chars + latin_chars
    if total_alpha == 0:
        return True
    if lang_base == "ar" and len(latin_words) < 4:
        return True
    if ar_chars / total_alpha >= 0.65 and len(latin_words) < 5:
        return True
    return False


# ------------------------------------------------------------------------------
# Step 1: Sync Originals to Cloudflare R2
# ------------------------------------------------------------------------------
def sync_originals_to_r2(client: Any, bucket: str, files: List[Path]) -> Tuple[int, int]:
    print(f"[R2 Sync] Listing existing objects in s3://{bucket}/slides/ ...")
    existing = list_r2_etags(client, bucket, prefix="slides/")
    uploaded = 0
    skipped = 0

    for idx, path in enumerate(files, 1):
        key = to_r2_key(path)
        md5_hex, _ = file_md5_sha256(path)
        if existing.get(key) == md5_hex:
            skipped += 1
            continue

        client.upload_file(
            str(path),
            bucket,
            key,
            ExtraArgs={
                "ContentType": content_type_for(path),
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )
        uploaded += 1
        if uploaded % 50 == 0 or idx == len(files):
            print(f"[R2 Sync] Progress: {idx}/{len(files)} (uploaded={uploaded}, skipped={skipped})")

    print(f"[R2 Sync] Complete: uploaded={uploaded}, skipped={skipped}, total={len(files)}")
    return uploaded, skipped


# ------------------------------------------------------------------------------
# Step 2: Translate Foreign-Language Slides via Google Lens (Online Only)
# ------------------------------------------------------------------------------
async def translate_all_slides(
    client: Any,
    bucket: str,
    public_url: str,
    files: List[Path],
    force: bool = False,
    max_slides: int = 0,
    concurrency: int = 2,
) -> None:
    from chrome_lens_py import LensAPI

    apply_clean_renderer_patches()
    font_path = find_arabic_font()
    print(f"[Lens] Using Arabic font: {font_path or 'default'}")

    arabic_subjects = load_arabic_only_subjects()
    manifest = load_manifest(client, bucket, public_url)
    slides_map: Dict[str, Any] = manifest["slides"]

    todo: List[Tuple[Path, str, str]] = []
    skipped_cached = 0
    skipped_subject_ar = 0

    for path in files:
        key = to_r2_key(path)
        subj = path.relative_to(SLIDES_DIR).parts[0].lower()
        _, sha_hex = file_md5_sha256(path)

        if subj in arabic_subjects:
            slides_map[key] = {"sha256": sha_hex, "status": "skipped_arabic"}
            skipped_subject_ar += 1
            continue

        prev = slides_map.get(key)
        if (
            not force
            and isinstance(prev, dict)
            and prev.get("sha256") == sha_hex
            and prev.get("status") in ("translated", "skipped_arabic")
        ):
            skipped_cached += 1
            continue

        todo.append((path, key, sha_hex))

    if max_slides > 0:
        todo = todo[:max_slides]

    print(
        f"[Lens] Queue: {len(todo)} to translate "
        f"(cached={skipped_cached}, arabic_subject_skipped={skipped_subject_ar}, total={len(files)})"
    )
    if not todo:
        save_manifest(client, bucket, manifest)
        return

    sem = asyncio.Semaphore(max(1, concurrency))
    stats = {"translated": 0, "skipped_arabic": 0, "failed": 0, "done": 0}
    dirty_since_save = 0
    lock = asyncio.Lock()

    async def process_one(path: Path, key: str, sha_hex: str) -> None:
        nonlocal dirty_since_save
        async with sem:
            ar_key = to_ar_key(key)
            last_err: Optional[Exception] = None
            res: Optional[Dict[str, Any]] = None
            overlay_bytes: Optional[bytes] = None

            with tempfile.TemporaryDirectory(prefix="usp_lens_") as tmp:
                tmp_in = os.path.join(tmp, "in.png")
                tmp_out = os.path.join(tmp, "out.png")

                with Image.open(path) as im:
                    im.convert("RGB").save(tmp_in, format="PNG")

                for attempt in range(3):
                    lens = LensAPI(font_path=font_path)
                    try:
                        res = await lens.process_image(
                            image_path=tmp_in,
                            target_translation_language="ar",
                            output_overlay_path=tmp_out,
                            output_format="detailed",
                            outline_scale=0.0,
                            text_align="auto",
                            min_readable_px=8.0,
                            erase_mode="patch",
                            new_session=(attempt > 0),
                        )
                        if os.path.exists(tmp_out):
                            with Image.open(tmp_out) as out_im:
                                buf = io.BytesIO()
                                out_im.convert("RGB").save(buf, format="WEBP", quality=86, method=4)
                                overlay_bytes = buf.getvalue()
                        break
                    except Exception as exc:
                        last_err = exc
                        backoff = (2.5 ** attempt) + random.uniform(0.4, 1.4)
                        print(f"[Lens] Retry {attempt + 1}/3 for {key}: {exc} (sleep {backoff:.1f}s)")
                        await asyncio.sleep(backoff)
                    finally:
                        try:
                            await lens.aclose()
                        except Exception:
                            pass

            ocr_raw = (res or {}).get("ocr_text", "")
            if not ocr_raw and (res or {}).get("detailed_blocks"):
                ocr_raw = "\n".join(b.get("text", "") for b in res["detailed_blocks"] if b.get("text"))
            ocr_text = "\n".join(ocr_raw) if isinstance(ocr_raw, list) else str(ocr_raw or "")
            detected_lang = str((res or {}).get("detected_language") or "auto")

            async with lock:
                stats["done"] += 1
                if res is None:
                    stats["failed"] += 1
                    slides_map[key] = {"sha256": sha_hex, "status": "failed", "error": str(last_err)[:180]}
                    print(f"[Lens] FAILED ({stats['done']}/{len(todo)}) {key}: {last_err}")
                elif is_predominantly_arabic(ocr_text, detected_lang) or not overlay_bytes:
                    stats["skipped_arabic"] += 1
                    slides_map[key] = {"sha256": sha_hex, "status": "skipped_arabic", "lang": detected_lang}
                else:
                    client.put_object(
                        Bucket=bucket,
                        Key=ar_key,
                        Body=overlay_bytes,
                        ContentType="image/webp",
                        CacheControl="public, max-age=31536000, immutable",
                    )
                    stats["translated"] += 1
                    slides_map[key] = {"sha256": sha_hex, "status": "translated", "ar_key": ar_key}

                dirty_since_save += 1
                if dirty_since_save >= 25 or stats["done"] == len(todo):
                    save_manifest(client, bucket, manifest)
                    dirty_since_save = 0
                    print(
                        f"[Lens] Checkpoint {stats['done']}/{len(todo)} "
                        f"(translated={stats['translated']}, skipped_ar={stats['skipped_arabic']}, failed={stats['failed']})"
                    )

            # Polite jitter to prevent rate limiting
            await asyncio.sleep(random.uniform(0.35, 0.85))

    await asyncio.gather(*(process_one(p, k, s) for p, k, s in todo))
    save_manifest(client, bucket, manifest)
    print(
        f"[Lens] Finished! translated={stats['translated']}, "
        f"skipped_arabic={stats['skipped_arabic']}, failed={stats['failed']}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Cloud R2 slide sync & Google Lens Arabic translator")
    parser.add_argument("--subject", default="", help="Optional subject code filter (e.g. toc, sec, phy)")
    parser.add_argument("--sync-originals", action="store_true", help="Upload original slides to R2")
    parser.add_argument("--translate", action="store_true", help="Translate foreign-language slides via Google Lens")
    parser.add_argument("--force", action="store_true", help="Force re-translation even if SHA-256 cached")
    parser.add_argument("--max-slides", type=int, default=0, help="Optional cap on slides translated per run (0=all)")
    parser.add_argument("--concurrency", type=int, default=2, help="Parallel Google Lens requests (default=2)")
    args = parser.parse_args()

    if not args.sync_originals and not args.translate:
        args.sync_originals = True
        args.translate = True

    subject_filter = args.subject.strip() or None
    files = discover_slides(subject_filter)
    print(f"[Pipeline] Found {len(files)} slide images (subject={subject_filter or 'ALL'})")
    if not files:
        return 0

    client, bucket, public_url = make_r2_client()
    t0 = time.time()

    if args.sync_originals:
        sync_originals_to_r2(client, bucket, files)

    if args.translate:
        asyncio.run(
            translate_all_slides(
                client=client,
                bucket=bucket,
                public_url=public_url,
                files=files,
                force=args.force,
                max_slides=args.max_slides,
                concurrency=args.concurrency,
            )
        )

    print(f"[Pipeline] Done in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())

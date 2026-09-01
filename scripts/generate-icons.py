#!/usr/bin/env python3
"""Generates every raster app-icon file (public/icon-192.png,
public/icon-512.png, public/apple-touch-icon.png, src/app/favicon.ico) from
the Steadwell brand mark — a circle, a serif "S", and two leaves (sage +
terracotta) tucked under the ring, matching the brand guide exactly. The
same mark also exists as a live inline SVG for the app's own header nav —
see src/components/BrandMark.tsx — this script exists only because the PWA
manifest icons and favicon.ico have to be real raster/ICO files on disk,
not something a browser can render from SVG-in-JSX at request time.

Requires Pillow (`pip install pillow`) and the actual Cormorant Bold font
file — pulled at build time from the @fontsource/cormorant package already
in node_modules (see FONT_PATH below), converted from .woff to .ttf with
fontTools since Pillow can't load .woff directly:

    python3 -c "
    from fontTools.ttLib import TTFont
    f = TTFont('node_modules/@fontsource/cormorant/files/cormorant-latin-700-normal.woff')
    f.flavor = None
    f.save('/tmp/cormorant-700.ttf')
    "
    python3 scripts/generate-icons.py

Re-run this only if the brand mark or palette itself changes — the output
files are committed, this script is just how they were made.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

DARK = (31, 61, 52, 255)      # #1F3D34
SAGE = (125, 153, 135, 255)   # #7D9987
ACCENT = (212, 176, 140, 255) # #D4B08C
CREAM = (243, 243, 241, 255)  # #F3F3F1

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = "/tmp/cormorant-700.ttf"


def leaf(draw, cx, cy, length, width, angle_deg, color):
    """A simple pointed-oval leaf polygon, rotated to angle_deg (0 = pointing right)."""
    ang = math.radians(angle_deg)
    steps = 24
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = t * length
        w = width * math.sin(t * math.pi) ** 0.8
        pts.append((x, w / 2))
    for i in range(steps, -1, -1):
        t = i / steps
        x = t * length
        w = width * math.sin(t * math.pi) ** 0.8
        pts.append((x, -w / 2))
    rotated = []
    for (x, y) in pts:
        rx = x * math.cos(ang) - y * math.sin(ang)
        ry = x * math.sin(ang) + y * math.cos(ang)
        rotated.append((cx + rx, cy + ry))
    draw.polygon(rotated, fill=color)


def make_mark(size, bg_color, ring_color, letter_color, rounded=True):
    img = Image.new("RGBA", (size, size), bg_color)
    if rounded:
        radius = int(size * 0.22)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        img = Image.composite(Image.new("RGBA", (size, size), bg_color), Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size * 0.46
    r = size * 0.30
    ring_w = max(2, int(size * 0.018))

    leaf_len, leaf_w = r * 1.55, r * 0.62
    base_x, base_y = cx, cy + r * 0.92
    leaf(draw, base_x, base_y, leaf_len, leaf_w, 200, SAGE)
    leaf(draw, base_x, base_y, leaf_len, leaf_w, -20, ACCENT)

    inner_r = r - ring_w
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=bg_color)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring_color, width=ring_w)

    font = ImageFont.truetype(FONT_PATH, int(r * 1.55))
    bbox = draw.textbbox((0, 0), "S", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - r * 0.06), "S", font=font, fill=letter_color)
    return img


def main():
    public = os.path.join(REPO_ROOT, "public")
    make_mark(512, DARK, CREAM, CREAM, rounded=True).convert("RGB").save(os.path.join(public, "icon-512.png"))
    make_mark(192, DARK, CREAM, CREAM, rounded=True).convert("RGB").save(os.path.join(public, "icon-192.png"))
    make_mark(180, DARK, CREAM, CREAM, rounded=False).convert("RGB").save(os.path.join(public, "apple-touch-icon.png"))

    sizes = [16, 32, 48, 64]
    imgs = [make_mark(s, DARK, CREAM, CREAM, rounded=(s >= 48)) for s in sizes]
    favicon_path = os.path.join(REPO_ROOT, "src", "app", "favicon.ico")
    imgs[-1].save(favicon_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    print("Wrote icon-512.png, icon-192.png, apple-touch-icon.png, favicon.ico")


if __name__ == "__main__":
    main()

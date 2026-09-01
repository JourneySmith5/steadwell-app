#!/usr/bin/env python3
"""Generates every derived brand-mark asset from the real logo files Journey
provided (public/brand/source/ — exported from the actual design file, not
hand-traced). This script does two things:

1. Chroma-keys the near-solid background out of two source exports to make
   reusable transparent PNGs:
     - public/brand/mark-on-light.png   (dark-green ink — for light backgrounds:
       the header nav, the landing page)
     - public/brand/mark-on-dark.png    (cream ink — cropped out of the "stacked
       on dark" export, for dark backgrounds)
2. Composites mark-on-dark.png onto this app's actual --brand-dark token
   (#1F3D34, which is a hair different from the ink baked into the source
   files — that's just those files' own export color, not a bug) to produce
   every raster icon file the app needs: public/icon-192.png,
   public/icon-512.png, public/apple-touch-icon.png, and src/app/favicon.ico.

Re-run this only if Journey supplies new source logo files (replace the
files in public/brand/source/ first) — the output files are committed, this
script is just how they were made. Requires Pillow (`pip install pillow`).
"""
import os
from PIL import Image, ImageDraw

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(REPO_ROOT, "public", "brand", "source")
BRAND = os.path.join(REPO_ROOT, "public", "brand")
DARK = (31, 61, 52, 255)  # --brand-dark, src/app/globals.css


def dist(p1, p2):
    return sum((a - b) ** 2 for a, b in zip(p1, p2)) ** 0.5


def remove_bg_color(im, bg, tol_low=10, tol_high=45):
    """Keys out `bg` with a soft-edged threshold (not a hard cutoff) so the
    source's own anti-aliasing on the mark's edges is preserved rather than
    left as a jagged line."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = dist((r, g, b), bg)
            if d <= tol_low:
                new_a = 0
            elif d >= tol_high:
                new_a = a
            else:
                new_a = int(a * (d - tol_low) / (tol_high - tol_low))
            px[x, y] = (r, g, b, new_a)
    return im


def find_content_bbox(im, bg, y_range=None, threshold=25):
    """Bounding box of pixels that differ from `bg` by more than threshold,
    restricted to rows in y_range (start, end) if given."""
    w, h = im.size
    y0, y1 = y_range if y_range else (0, h)
    minx, miny, maxx, maxy = w, y1, 0, 0
    for y in range(y0, y1):
        for x in range(w):
            if dist(im.getpixel((x, y)), bg) > threshold:
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
    return minx, miny, maxx, maxy


def find_mark_text_gap_row(im, bg, threshold=25):
    """The stacked-dark source is mark-above-wordmark on one solid
    background. Scan row-by-row content density to find the empty band
    between the circular mark and the "Steadwell" wordmark below it, so the
    mark can be cropped out without slicing into the text."""
    w, h = im.size
    row_counts = [sum(1 for x in range(w) if dist(im.getpixel((x, y)), bg) > threshold) for y in range(h)]
    # Walk past the initial dense mark region, then return the first
    # near-empty row after it — that's the gap.
    y = 0
    while y < h and row_counts[y] < 5:
        y += 1
    seen_content = False
    for y in range(y, h):
        if row_counts[y] >= 5:
            seen_content = True
        elif seen_content and row_counts[y] < 3:
            return y
    return h


def make_mark_on_light():
    src = Image.open(os.path.join(SOURCE, "mark-light.png")).convert("RGB")
    w, h = src.size
    bg = src.getpixel((2, 2))
    cutout = remove_bg_color(src, bg)
    cutout.save(os.path.join(BRAND, "mark-on-light.png"))
    return cutout


def make_mark_on_dark_cutout():
    # The stacked-dark export has a ~3px stray border artifact right at the
    # image edge (not part of the logo) — trim it before analysis.
    src = Image.open(os.path.join(SOURCE, "stacked-dark.png")).convert("RGB")
    w, h = src.size
    trimmed = src.crop((3, 3, w - 3, h - 3))
    bg = trimmed.getpixel((2, 2))

    gap_row = find_mark_text_gap_row(trimmed, bg)
    minx, miny, maxx, maxy = find_content_bbox(trimmed, bg, y_range=(0, gap_row))

    # This particular export has a small stray artifact (looks like a tiny
    # leftover label, maybe "51" — not part of the logo) a few pixels below
    # where the two leaf tips converge, right at the bottom of the
    # mark/text gap. It's the only thing in that last strip — the leaves
    # themselves are already complete above it — so trim it off rather than
    # let it into the cutout.
    STRAY_ARTIFACT_TRIM = 12
    maxy -= STRAY_ARTIFACT_TRIM

    pad = 8
    crop = trimmed.crop((minx - pad, max(0, miny - pad), maxx + pad, maxy + pad))
    cutout = remove_bg_color(crop, bg)
    cutout.save(os.path.join(BRAND, "mark-on-dark.png"))
    return cutout


def make_icon(mark_on_dark, size, rounded=True):
    canvas = Image.new("RGBA", (size, size), DARK)
    target_w = int(size * 0.78)
    scale = target_w / mark_on_dark.width
    target_h = int(mark_on_dark.height * scale)
    resized = mark_on_dark.resize((target_w, target_h), Image.LANCZOS)
    x, y = (size - target_w) // 2, (size - target_h) // 2
    canvas.alpha_composite(resized, (x, y))
    if not rounded:
        return canvas
    radius = int(size * 0.22)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    return out


def main():
    os.makedirs(BRAND, exist_ok=True)
    make_mark_on_light()
    mark_on_dark = make_mark_on_dark_cutout()

    public = os.path.join(REPO_ROOT, "public")
    make_icon(mark_on_dark, 512, rounded=True).convert("RGB").save(os.path.join(public, "icon-512.png"))
    make_icon(mark_on_dark, 192, rounded=True).convert("RGB").save(os.path.join(public, "icon-192.png"))
    # Apple touch icon: full-bleed square, no pre-rounding — iOS applies its
    # own mask + optional shine.
    make_icon(mark_on_dark, 180, rounded=False).convert("RGB").save(os.path.join(public, "apple-touch-icon.png"))

    sizes = [16, 32, 48, 64]
    imgs = [make_icon(mark_on_dark, s, rounded=(s >= 48)) for s in sizes]
    favicon_path = os.path.join(REPO_ROOT, "src", "app", "favicon.ico")
    imgs[-1].save(favicon_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=imgs[:-1])

    print("Wrote public/brand/mark-on-light.png, public/brand/mark-on-dark.png,")
    print("icon-512.png, icon-192.png, apple-touch-icon.png, favicon.ico")


if __name__ == "__main__":
    main()

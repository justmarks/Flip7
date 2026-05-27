"""
Generate Flip7 PWA icons + favicon + apple-touch-icon + in-app logo
from a source banner image (white background, RGB).

Usage:
    python scripts/CreateLogo.py [path/to/source.png]

Defaults to the Flip7Banner.webp in ~/Downloads, falling back to
the Flip7Logo.png at the repo root.
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parent.parent
PUBLIC = REPO / "public"
ICONS = PUBLIC / "icons"

DEFAULT_CANDIDATES = [
    Path.home() / "Downloads" / "Flip7Banner.webp",
    REPO / "Flip7Logo.png",
]

# Brand colors sampled from the logo (RGB).
NAVY = (45, 39, 92)
TEAL = (78, 180, 179)
CORAL = (235, 94, 85)
YELLOW = (245, 212, 100)
LIME = (161, 212, 104)
WHITE = (255, 255, 255)

# Diagonal gradient stops for the icon border ring.
GRADIENT_STOPS = [TEAL, YELLOW, CORAL, TEAL]


# ---------- source loading ----------

def load_logo(path: Path) -> Image.Image:
    """Open the source, key near-white pixels to alpha, crop to content bbox."""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3]

    # Hard-key fully white pixels.
    fully_white = (rgb > 240).all(axis=2)
    arr[fully_white, 3] = 0

    # Soft-key off-whites for clean edges.
    near = ((rgb > 220).all(axis=2)) & ~fully_white
    bright = rgb[near].min(axis=1).astype(np.float32)  # 221..240
    arr[near, 3] = (255 * (240 - bright) / 20.0).clip(0, 255).astype(np.uint8)

    out = Image.fromarray(arr)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def make_seven_with_fan(full: Image.Image) -> Image.Image:
    """Crop the right ~28% of the wordmark — just the big '7' plus the
    rightmost cards of the fan, no trailing edge of the 'P'."""
    w, h = full.size
    crop = full.crop((int(w * 0.72), 0, w, h))
    bbox = crop.getbbox()
    return crop.crop(bbox) if bbox else crop


# ---------- drawing primitives ----------

def diagonal_gradient(size: tuple[int, int], stops) -> Image.Image:
    """RGB gradient stepping diagonally (top-left → bottom-right) through stops."""
    w, h = size
    n_segs = len(stops) - 1
    stops_arr = np.array(stops, dtype=np.float32)

    xx, yy = np.meshgrid(np.arange(w), np.arange(h))
    t = (xx + yy).astype(np.float32) / max(w + h - 2, 1) * n_segs
    idx = np.clip(t.astype(np.int32), 0, n_segs - 1)
    frac = (t - idx)[:, :, None]

    c0 = stops_arr[idx]
    c1 = stops_arr[idx + 1]
    out = c0 * (1 - frac) + c1 * frac
    return Image.fromarray(out.astype(np.uint8))


def rounded_square_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=radius, fill=255
    )
    return mask


def fit(logo: Image.Image, box_w: int, box_h: int) -> Image.Image:
    lw, lh = logo.size
    scale = min(box_w / lw, box_h / lh)
    new = (max(1, int(lw * scale)), max(1, int(lh * scale)))
    return logo.resize(new, Image.LANCZOS)


# ---------- icon composition ----------

def make_icon(size: int, logo: Image.Image, *, maskable: bool = False) -> Image.Image:
    """Render one square app icon.

    - Standard: rounded white card with a diagonal gradient border ring,
      logo centered with margin.
    - Maskable: full-bleed white square, logo confined to the inner 74%
      safe-zone so Android's adaptive mask doesn't clip it.
    """
    if maskable:
        icon = Image.new("RGBA", (size, size), WHITE + (255,))
        margin = int(size * 0.13)
    else:
        radius = int(size * 0.22)
        border = max(2, size // 32)

        ring_mask = rounded_square_mask(size, radius)
        grad = diagonal_gradient((size, size), GRADIENT_STOPS).convert("RGBA")
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        icon.paste(grad, (0, 0), ring_mask)

        inner = size - 2 * border
        inner_mask = rounded_square_mask(inner, max(0, radius - border))
        white_card = Image.new("RGBA", (inner, inner), WHITE + (255,))
        icon.paste(white_card, (border, border), inner_mask)

        margin = int(size * 0.12) + border

    box = size - 2 * margin
    fitted = fit(logo, box, box)
    fw, fh = fitted.size
    icon.paste(fitted, ((size - fw) // 2, (size - fh) // 2), fitted)
    return icon


# ---------- main ----------

def resolve_source() -> Path:
    if len(sys.argv) > 1:
        p = Path(sys.argv[1])
        if not p.exists():
            sys.exit(f"Source not found: {p}")
        return p
    for cand in DEFAULT_CANDIDATES:
        if cand.exists():
            return cand
    sys.exit(
        "No source image found. Pass one as argv[1] or place one at: "
        + ", ".join(str(c) for c in DEFAULT_CANDIDATES)
    )


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    src = resolve_source()
    print(f"Source: {src}")

    full = load_logo(src)
    print(f"  full logo:    {full.size}")

    seven = make_seven_with_fan(full)
    print(f"  '7' + fan:    {seven.size}")

    # ---- In-app wordmark logo (transparent) ----
    # Cap 1x at 720px wide; @2x is the original high-res.
    if full.width > 720:
        ratio = 720 / full.width
        full_1x = full.resize((720, int(full.height * ratio)), Image.LANCZOS)
    else:
        full_1x = full
    full_1x.save(PUBLIC / "flip7-logo.png")
    full.save(PUBLIC / "flip7-logo@2x.png")
    print(f"  flip7-logo.png    {full_1x.size}")
    print(f"  flip7-logo@2x.png {full.size}")

    # ---- App icons ----
    SMALL = [16, 32, 48]                       # small sizes use the '7' + fan crop
    LARGE = [96, 144, 192, 256, 384, 512]      # large sizes use the full wordmark
    small_icons: dict[int, Image.Image] = {}

    for s in SMALL:
        ic = make_icon(s, seven)
        ic.save(ICONS / f"icon-{s}.png")
        small_icons[s] = ic
        print(f"  icon-{s}.png")

    for s in LARGE:
        ic = make_icon(s, full)
        ic.save(ICONS / f"icon-{s}.png")
        print(f"  icon-{s}.png")

    # ---- Maskable variants (Android adaptive icon) ----
    for s in (192, 512):
        ic = make_icon(s, full, maskable=True)
        ic.save(ICONS / f"icon-maskable-{s}.png")
        print(f"  icon-maskable-{s}.png")

    # ---- apple-touch-icon (iOS home screen, 180×180, full bleed) ----
    apple = make_icon(180, full, maskable=True)
    apple.save(PUBLIC / "apple-touch-icon.png")
    print("  apple-touch-icon.png")

    # ---- favicon.ico (multi-resolution 16+32+48) ----
    ico_path = PUBLIC / "favicon.ico"
    small_icons[48].save(
        ico_path,
        format="ICO",
        append_images=[small_icons[32], small_icons[16]],
    )
    print("  favicon.ico (16+32+48)")

    print("Done.")


if __name__ == "__main__":
    main()

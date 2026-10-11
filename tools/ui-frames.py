"""產生面板外框（image/ui/panel-frame*.png），配色和按鈕外框 button-frame.png 同一套。

16×16 的九宮格（border-image-slice: 4），顯示時放大 2 倍（border-width: 8px）。
由外到內：深灰外框 → 金屬邊 → 深色間隙 → 暗青色內線 → 面板底色；四個角有亮色的 HUD 角括號。

用法：py tools/ui-frames.py
"""

import os

from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "image", "ui")
SIZE = 16

OUTER = (46, 50, 60, 255)
METAL = (74, 82, 98, 255)
GAP = (11, 14, 43, 255)
FILL = (20, 24, 56, 255)

VARIANTS = {
    "panel-frame": {"inner": (29, 61, 102, 255), "bracket": (79, 209, 255, 255)},
    "panel-frame-alert": {"inner": (90, 31, 51, 255), "bracket": (255, 85, 102, 255)},
    "panel-frame-gold": {"inner": (92, 70, 28, 255), "bracket": (255, 209, 102, 255)},
}


def build(inner, bracket):
    im = Image.new("RGBA", (SIZE, SIZE), FILL)
    for i, color in enumerate([OUTER, METAL, GAP, inner]):
        for t in range(i, SIZE - i):
            for (x, y) in ((t, i), (t, SIZE - 1 - i), (i, t), (SIZE - 1 - i, t)):
                im.putpixel((x, y), color)
    # 外框的四個角挖空，做出像素風的圓角
    for (x, y) in ((0, 0), (SIZE - 1, 0), (0, SIZE - 1), (SIZE - 1, SIZE - 1)):
        im.putpixel((x, y), (0, 0, 0, 0))
    # HUD 角括號：畫在金屬邊上，每邊 3 格
    for cx, cy, dx, dy in ((1, 1, 1, 1), (SIZE - 2, 1, -1, 1), (1, SIZE - 2, 1, -1), (SIZE - 2, SIZE - 2, -1, -1)):
        for k in range(3):
            im.putpixel((cx + k * dx, cy), bracket)
            im.putpixel((cx, cy + k * dy), bracket)
    return im


def starfield():
    """全站共用的像素星空背景（256×256 可無縫平鋪）：多數是 1 px 暗星，少數亮星帶十字光芒。"""
    import random

    rng = random.Random(20261115)
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    for _ in range(70):
        x, y = rng.randrange(256), rng.randrange(256)
        a = rng.choice((70, 110, 160))
        im.putpixel((x, y), (200, 214, 255, a))
    for _ in range(7):
        x, y = rng.randrange(2, 254), rng.randrange(2, 254)
        im.putpixel((x, y), (255, 255, 255, 230))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            im.putpixel((x + dx, y + dy), (160, 200, 255, 120))
    return im


def main():
    for name, v in VARIANTS.items():
        build(v["inner"], v["bracket"]).save(os.path.join(OUT, f"{name}.png"))
    starfield().save(os.path.join(OUT, "starfield.png"))
    print("ok")


if __name__ == "__main__":
    main()

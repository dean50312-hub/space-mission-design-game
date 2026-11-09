"""把 ChatGPT 生成的原始大圖縮成遊戲用的像素圖（output/art-refresh/originals/ → image/icons/）。

ChatGPT 交付的 native 版本把任務目標、事件、吉祥物縮成 32×32，但遊戲用 64 px 顯示，
細節太多的 AI 圖壓到 32 格再放大兩倍就糊成一團。這裡改成直接縮到顯示尺寸（1:1 顯示）：
- 裁掉透明邊、置中加一點留白
- LANCZOS 縮小，透明度二值化（像素圖不要半透明邊）
- 減到 24 色（不抖色），最後補 1 px 深色外框，在深藍背景上輪廓才清楚

用法：py tools/ai-art-reduce.py（需要本機有 output/art-refresh/originals/，那個資料夾不進 git）
"""

import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "output", "art-refresh", "originals", "icons")
OUT = os.path.join(ROOT, "image", "icons")
OUTLINE = (7, 10, 36, 255)

# 檔名前綴 → 輸出尺寸（等於 css/style.css 裡的顯示尺寸）
TARGETS = {"objective-": 64, "event-": 64, "mascot-orbit": 64, "orbit-": 96}


def reduce(path, size, colors=24):
    im = Image.open(path).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    im = im.crop(bbox)
    w, h = im.size
    side = max(w, h)
    pad = int(side * 0.07)
    square = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    square.paste(im, ((side - w) // 2 + pad, (side - h) // 2 + pad))
    small = square.resize((size, size), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    rgb = small.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return add_outline(out)


def add_outline(im):
    px = im.load()
    w, h = im.size
    edge = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and px[nx, ny] != OUTLINE:
                    edge.append((x, y))
                    break
    for x, y in edge:
        px[x, y] = OUTLINE
    return im


def main():
    count = 0
    for name in sorted(os.listdir(SRC)):
        size = next((s for prefix, s in TARGETS.items() if name.startswith(prefix)), None)
        if size:
            reduce(os.path.join(SRC, name), size).save(os.path.join(OUT, name))
            count += 1
    print("ok", count)


if __name__ == "__main__":
    main()

"""把 ChatGPT 生成的原始大圖縮成遊戲用的像素圖（output/art-refresh/originals/ → image/icons/）。

ChatGPT 交付的 native 版本把任務目標、事件、吉祥物縮成 32×32，但遊戲用 64 px 顯示，
細節太多的 AI 圖壓到 32 格再放大兩倍就糊成一團。這裡改成直接縮到顯示尺寸（1:1 顯示）：
- 裁掉透明邊、置中加一點留白
- LANCZOS 縮小，透明度二值化（像素圖不要半透明邊）
- 減到 24 色（不抖色），最後補 1 px 深色外框，在深藍背景上輪廓才清楚

零件圖（image/parts/）另外處理：卡片上用 96 px 顯示、手機螢幕密度又高，所以輸出 192 px（顯示尺寸的 2 倍），
並把四周透明邊裁到最小，讓零件本體填滿圖框；CSS 用平滑縮放顯示。

用法：py tools/ai-art-reduce.py（需要本機有 output/art-refresh/originals/，那個資料夾不進 git）
"""

import os

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "output", "art-refresh", "originals", "icons")
OUT = os.path.join(ROOT, "image", "icons")
PARTS_SRC = os.path.join(ROOT, "output", "art-refresh", "originals", "parts")
PARTS_OUT = os.path.join(ROOT, "image", "parts")
PARTS_SIZE = 192
# 火箭（第三輪）：飛行畫面顯示 96 px 高，輸出 2 倍密度；左右裁到緊貼箭體，
# js/simulation.js 的 ROCKET_STAGING 比例是以這個裁切後的圖量的
ROCKETS_SRC = os.path.join(ROOT, "output", "rocket-refresh", "originals", "rocket")
ROCKETS_OUT = os.path.join(ROOT, "image", "rocket")
ROCKET_HEIGHT = 192
OUTLINE = (7, 10, 36, 255)

# 檔名前綴 → 輸出尺寸（等於 css/style.css 裡的顯示尺寸）
TARGETS = {"objective-": 64, "event-": 64, "mascot-orbit": 64, "orbit-": 96}


def reduce(path, size, colors=24, pad_ratio=0.07, outline_px=1):
    im = Image.open(path).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    im = im.crop(bbox)
    w, h = im.size
    side = max(w, h)
    pad = int(side * pad_ratio)
    square = Image.new("RGBA", (side + 2 * pad, side + 2 * pad), (0, 0, 0, 0))
    square.paste(im, ((side - w) // 2 + pad, (side - h) // 2 + pad))
    small = square.resize((size, size), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    rgb = small.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    for i in range(outline_px):
        out = add_outline(out, grow=i > 0)
    return out


def reduce_rocket(path, colors=32):
    im = Image.open(path).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox())
    w = max(1, round(im.width * ROCKET_HEIGHT / im.height))
    small = im.resize((w, ROCKET_HEIGHT), Image.LANCZOS)
    alpha = small.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    out = small.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    out.putalpha(alpha)
    return out


# grow=True：從已經畫好的外框再往外加一圈（第二圈以後）
def add_outline(im, grow=False):
    px = im.load()
    w, h = im.size
    edge = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and (grow or px[nx, ny] != OUTLINE):
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
    for name in sorted(os.listdir(PARTS_SRC)):
        if name.endswith(".png"):
            reduce(os.path.join(PARTS_SRC, name), PARTS_SIZE, colors=48, pad_ratio=0.03, outline_px=2).save(os.path.join(PARTS_OUT, name))
            count += 1
    for name in sorted(os.listdir(ROCKETS_SRC)):
        if name.endswith(".png"):
            reduce_rocket(os.path.join(ROCKETS_SRC, name)).save(os.path.join(ROCKETS_OUT, name))
            count += 1
    print("ok", count)


if __name__ == "__main__":
    main()

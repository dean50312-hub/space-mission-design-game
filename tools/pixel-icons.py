"""產生遊戲裡所有的像素圖示（image/icons/*.png），取代原本的 emoji，讓美術風格一致。

規則：
- 插圖 32×32、小圖示 16×16，顯示時用整數倍放大（image-rendering: pixelated）
- 先畫填色，最後由 outline() 自動補上 1 px 深色外框，所以所有圖示的外框粗細一致
- 光源在左上：亮面放左上、暗面放右下
- 只用下面 PAL 裡的顏色（和 css/style.css 的色彩變數同一套）

用法：py tools/pixel-icons.py（會順便在 tools/ 旁輸出一張預覽圖 icons_preview.png，不要 commit）
"""

import math
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "image", "icons")

PAL = {
    "k": (11, 14, 31, 255),  # 外框
    "w": (232, 236, 255, 255),
    "W": (176, 186, 214, 255),
    "c": (79, 209, 255, 255),
    "C": (31, 127, 179, 255),
    "L": (184, 240, 255, 255),
    "y": (255, 209, 102, 255),
    "Y": (209, 139, 31, 255),
    "Z": (255, 241, 184, 255),
    "r": (255, 85, 102, 255),
    "R": (184, 40, 60, 255),
    "g": (87, 227, 137, 255),
    "G": (35, 163, 90, 255),
    "s": (162, 170, 182, 255),
    "S": (92, 99, 112, 255),
    "l": (223, 229, 238, 255),
    "o": (255, 159, 67, 255),
    "O": (196, 98, 26, 255),
    "v": (179, 136, 255, 255),
    "V": (111, 75, 209, 255),
    "b": (42, 111, 209, 255),
    "B": (25, 66, 140, 255),
    "e": (70, 160, 70, 255),
    "n": (150, 104, 60, 255),
    "N": (104, 70, 40, 255),
    "p": (255, 150, 180, 255),
    "d": (40, 46, 74, 255),
}


def P(key):
    return PAL[key]


class Icon:
    def __init__(self, size):
        self.size = size
        self.im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, c):
        if 0 <= x < self.size and 0 <= y < self.size:
            self.im.putpixel((x, y), P(c))

    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=P(c))

    def line(self, pts, c, w=1):
        self.d.line(pts, fill=P(c), width=w)

    def circle(self, cx, cy, r, c):
        self.d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=P(c))

    def ellipse(self, x0, y0, x1, y1, c, outline=False):
        if outline:
            self.d.ellipse([x0, y0, x1, y1], outline=P(c))
        else:
            self.d.ellipse([x0, y0, x1, y1], fill=P(c))

    def poly(self, pts, c):
        self.d.polygon(pts, fill=P(c))

    def arc(self, box, start, end, c, w=1):
        self.d.arc(box, start, end, fill=P(c), width=w)

    def ascii(self, x0, y0, rows):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != ".":
                    self.px(x0 + x, y0 + y, ch)

    def outline(self):
        src = self.im.copy()
        w, h = src.size
        for y in range(h):
            for x in range(w):
                if src.getpixel((x, y))[3] != 0:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] != 0 and src.getpixel((nx, ny)) != P("k"):
                        self.im.putpixel((x, y), P("k"))
                        break
        return self


# ---------- 小字（3×5）----------

FONT = {
    "S": ["www", "w..", "www", "..w", "www"],
    "$": [".w.", "www", "ww.", ".ww", "www"],
    "!": [".w.", ".w.", ".w.", "...", ".w."],
    "K": ["w.w", "ww.", "w..", "ww.", "w.w"],
    "G": ["www", "w..", "w.w", "w.w", "www"],
}


def text(ic, x, y, s, c):
    for i, ch in enumerate(s):
        for dy, row in enumerate(FONT[ch]):
            for dx, v in enumerate(row):
                if v != ".":
                    ic.px(x + i * 4 + dx, y + dy, c)


# ---------- 共用造型 ----------

def sun(ic, cx, cy, r, rays=True):
    if rays:
        for k in range(8):
            a = k * math.pi / 4
            x1, y1 = cx + math.cos(a) * (r + 1), cy + math.sin(a) * (r + 1)
            x2, y2 = cx + math.cos(a) * (r + 4), cy + math.sin(a) * (r + 4)
            ic.line([(round(x1), round(y1)), (round(x2), round(y2))], "y", 2 if k % 2 == 0 else 1)
    ic.circle(cx, cy, r, "Y")
    ic.circle(cx - 1, cy - 1, r - 1, "y")
    ic.circle(cx - 2, cy - 2, max(1, r // 3), "Z")


def cloud(ic, x, y, scale=1, dark=False):
    base, light = ("S", "s") if dark else ("W", "w")
    s = scale
    ic.circle(x + 5 * s, y + 6 * s, 4 * s, base)
    ic.circle(x + 11 * s, y + 4 * s, 5 * s, base)
    ic.circle(x + 17 * s, y + 6 * s, 4 * s, base)
    ic.rect(x + 3 * s, y + 6 * s, x + 19 * s, y + 10 * s, base)
    ic.circle(x + 10 * s, y + 3 * s, 3 * s, light)
    ic.circle(x + 5 * s, y + 5 * s, 2 * s, light)


def earth(ic, cx, cy, r, ice=False):
    ic.circle(cx, cy, r, "B")
    ic.circle(cx - 1, cy - 1, r - 1, "b")
    if r >= 5:
        ic.ellipse(cx - r // 2 - 1, cy - r // 3, cx + 1, cy + r // 3, "e")
        ic.ellipse(cx + 1, cy - r // 2, cx + r // 2 + 1, cy, "e")
    if ice:
        ic.ellipse(cx - r // 2, cy - r + 1, cx + r // 2, cy - r // 2, "w")
    ic.px(cx - r // 2, cy - r // 2, "L")


def satellite(ic, x, y, c="s"):
    ic.rect(x - 1, y - 1, x + 1, y + 1, c)
    ic.rect(x - 4, y, x - 2, y, "c")
    ic.rect(x + 2, y, x + 4, y, "c")


def shield(ic, x0, y0, w, h, main, dark, light):
    pts = [(x0, y0), (x0 + w, y0), (x0 + w, y0 + h * 0.55), (x0 + w / 2, y0 + h), (x0, y0 + h * 0.55)]
    ic.poly(pts, dark)
    ic.poly([(x0 + 1, y0 + 1), (x0 + w / 2, y0 + 1), (x0 + w / 2, y0 + h - 2), (x0 + 1, y0 + h * 0.55)], main)
    ic.line([(x0 + 2, y0 + 2), (x0 + 2, y0 + h * 0.45)], light)


def bolt(ic, x, y, c, cd):
    ic.poly([(x + 6, y), (x, y + 9), (x + 4, y + 9), (x + 2, y + 16), (x + 9, y + 6), (x + 5, y + 6), (x + 8, y)], cd)
    ic.poly([(x + 6, y + 1), (x + 1, y + 8), (x + 4, y + 8), (x + 3, y + 13), (x + 7, y + 7), (x + 4, y + 7), (x + 7, y + 1)], c)


def coin_stack(ic, x, y, n):
    for i in range(n):
        yy = y - i * 3
        ic.ellipse(x, yy, x + 12, yy + 5, "Y")
        ic.ellipse(x, yy - 1, x + 12, yy + 4, "y")
        ic.line([(x + 3, yy + 1), (x + 9, yy + 1)], "Z")


def arrow(ic, x, y, up, c, cd):
    if up:
        ic.poly([(x + 4, y), (x + 9, y + 5), (x + 6, y + 5), (x + 6, y + 10), (x + 2, y + 10), (x + 2, y + 5), (x - 1, y + 5)], cd)
        ic.poly([(x + 4, y + 1), (x + 7, y + 4), (x + 5, y + 4), (x + 5, y + 9), (x + 3, y + 9), (x + 3, y + 4), (x + 1, y + 4)], c)
    else:
        ic.poly([(x + 2, y), (x + 6, y), (x + 6, y + 5), (x + 9, y + 5), (x + 4, y + 10), (x - 1, y + 5), (x + 2, y + 5)], cd)
        ic.poly([(x + 3, y + 1), (x + 5, y + 1), (x + 5, y + 6), (x + 7, y + 6), (x + 4, y + 9), (x + 1, y + 6), (x + 3, y + 6)], c)


def no_sign(ic, cx, cy, r):
    ic.d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=P("r"), width=2)
    ic.line([(cx - r + 2, cy - r + 2), (cx + r - 2, cy + r - 2)], "r", 2)


def dish(ic, x, y, scale=1):
    # 碟形天線：朝右上的碟面 + 支架
    ic.poly([(x + 4, y + 18), (x + 12, y + 18), (x + 10, y + 13), (x + 6, y + 13)], "S")
    ic.line([(x + 8, y + 13), (x + 8, y + 10)], "S", 2)
    ic.ellipse(x, y, x + 16, y + 12, "s")
    ic.ellipse(x + 2, y + 1, x + 15, y + 10, "l")
    ic.line([(x + 8, y + 6), (x + 14, y + 1)], "S")
    ic.circle(x + 14, y + 1, 1, "r")


# ---------- 任務目標 ----------

def objective_imaging():
    ic = Icon(32)
    for i, (bx, h) in enumerate([(5, 12), (10, 18), (15, 9), (19, 15), (24, 11)]):
        ic.rect(bx, 26 - h, bx + 4, 26, "S" if i % 2 else "s")
        ic.rect(bx, 26 - h, bx, 26, "l")
        for wy in range(28 - h, 25, 3):
            ic.px(bx + 2, wy, "y")
    ic.rect(3, 26, 28, 27, "S")
    for (x, y, dx, dy) in [(2, 2, 1, 1), (29, 2, -1, 1), (2, 29, 1, -1), (29, 29, -1, -1)]:
        ic.line([(x, y), (x + 5 * dx, y)], "c", 2)
        ic.line([(x, y), (x, y + 5 * dy)], "c", 2)
    ic.line([(15, 11), (15, 15)], "r")
    ic.line([(13, 13), (17, 13)], "r")
    return ic.outline()


def objective_climate():
    ic = Icon(32)
    earth(ic, 15, 16, 12)
    # 南北極冰帽
    ic.ellipse(8, 4, 22, 9, "w")
    ic.ellipse(10, 4, 18, 7, "l")
    ic.ellipse(9, 23, 21, 28, "W")
    # 溫度計：監測氣候變化
    ic.rect(26, 4, 29, 20, "w")
    ic.rect(27, 10, 28, 22, "r")
    ic.circle(27, 23, 3, "r")
    return ic.outline()


def objective_weather():
    ic = Icon(32)
    for arm in range(3):
        for k in range(36):
            th = k * 0.17 + arm * 2 * math.pi / 3
            r = 2 + k * 0.36
            x = 16 + math.cos(th) * r
            y = 16 + math.sin(th) * r
            c = "w" if k < 18 else ("L" if k < 28 else "c")
            ic.circle(round(x), round(y), 2 if k < 26 else 1, c)
    ic.circle(16, 16, 2, "B")
    ic.px(16, 16, "b")
    return ic.outline()


def objective_comms():
    ic = Icon(32)
    dish(ic, 3, 10)
    for i, r in enumerate((4, 8, 12)):
        ic.arc([17 - r + 6, 11 - r - 6, 17 + r + 6, 11 + r - 6], 200, 300, "y", 2)
    ic.rect(4, 28, 18, 29, "S")
    return ic.outline()


# ---------- 事件 ----------

def event_solar_flare():
    ic = Icon(32)
    sun(ic, 13, 18, 8)
    ic.arc([14, 2, 30, 18], 180, 350, "o", 3)
    ic.arc([16, 4, 28, 16], 180, 340, "r", 1)
    return ic.outline()


def event_geomagnetic_storm():
    ic = Icon(32)
    for side in (-1, 1):
        ic.arc([16 - 15 if side < 0 else 6, 4, 16 if side < 0 else 31, 28], 90 if side < 0 else 270, 270 if side < 0 else 450, "v", 1)
    earth(ic, 16, 17, 8)
    ic.arc([6, 4, 26, 20], 200, 340, "g", 2)
    ic.arc([9, 7, 23, 19], 210, 330, "G", 1)
    return ic.outline()


def event_bad_weather():
    ic = Icon(32)
    cloud(ic, 3, 3, 1, dark=True)
    for x in (6, 12, 22):
        ic.line([(x, 17), (x - 2, 22)], "c")
        ic.line([(x + 1, 24), (x - 1, 28)], "c")
    bolt(ic, 13, 13, "y", "Y")
    return ic.outline()


def event_small_debris():
    ic = Icon(32)
    for (x, y, l) in [(5, 7, 9), (9, 15, 11), (4, 22, 7)]:
        ic.line([(x, y), (x + l, y + l // 3)], "S")
    rocks = [(16, 9, 3), (22, 17, 2), (14, 21, 2), (24, 25, 3), (20, 5, 1)]
    for (x, y, r) in rocks:
        ic.circle(x, y, r, "S")
        ic.px(x - 1, y - 1, "s")
    ic.circle(27, 11, 2, "y")
    for dx, dy in ((-3, 0), (3, 0), (0, -3), (0, 3)):
        ic.px(27 + dx, 11 + dy, "o")
    return ic.outline()


def event_orbital_congestion():
    ic = Icon(32)
    ic.ellipse(1, 9, 30, 23, "C", outline=True)
    ic.ellipse(9, 1, 22, 30, "C", outline=True)
    earth(ic, 16, 16, 6)
    for (x, y) in [(5, 11), (26, 20), (12, 4), (21, 27), (28, 13)]:
        satellite(ic, x, y)
    for (x, y) in [(3, 22), (24, 4), (8, 27)]:
        ic.px(x, y, "S")
    return ic.outline()


def event_limited_ground_station():
    ic = Icon(32)
    dish(ic, 2, 6)
    ic.line([(18, 28), (28, 14)], "o", 3)
    ic.circle(28, 13, 3, "o")
    ic.px(29, 12, "k")
    ic.px(28, 11, "k")
    ic.rect(3, 27, 17, 28, "S")
    return ic.outline()


def event_mass_growth():
    ic = Icon(32)
    ic.poly([(5, 28), (21, 28), (18, 13), (8, 13)], "S")
    ic.poly([(6, 27), (13, 27), (13, 14), (9, 14)], "s")
    ic.arc([9, 7, 17, 16], 180, 360, "S", 2)
    text(ic, 9, 18, "KG", "w")
    arrow(ic, 22, 6, True, "r", "R")
    return ic.outline()


def event_budget_cut():
    ic = Icon(32)
    coin_stack(ic, 3, 24, 5)
    arrow(ic, 20, 8, False, "r", "R")
    return ic.outline()


def event_export_control():
    ic = Icon(32)
    ic.rect(4, 12, 22, 28, "N")
    ic.rect(5, 13, 21, 27, "n")
    for y in (17, 22):
        ic.line([(5, y), (21, y)], "N")
    ic.line([(5, 13), (21, 27)], "N")
    ic.circle(23, 10, 7, "w")
    no_sign(ic, 23, 10, 7)
    return ic.outline()


def event_launch_manifest():
    ic = Icon(32)
    ic.rect(4, 6, 27, 28, "w")
    ic.rect(4, 6, 27, 11, "r")
    ic.rect(4, 6, 27, 7, "R")
    for x in (9, 22):
        ic.rect(x, 3, x + 1, 8, "S")
    for gy in range(14, 27, 4):
        for gx in range(7, 26, 4):
            ic.rect(gx, gy, gx + 1, gy + 1, "W")
    for (gx, gy) in [(11, 14), (15, 18), (19, 14), (23, 22), (7, 22)]:
        ic.line([(gx - 1, gy - 1), (gx + 2, gy + 2)], "R")
        ic.line([(gx + 2, gy - 1), (gx - 1, gy + 2)], "R")
    return ic.outline()


def event_flagship():
    ic = Icon(32)
    ic.poly([(3, 13), (16, 6), (29, 13)], "l")
    ic.poly([(6, 12), (16, 7), (16, 12)], "w")
    ic.rect(4, 13, 28, 14, "s")
    for x in (6, 11, 16, 21, 26):
        ic.rect(x - 1, 15, x, 25, "w")
        ic.px(x, 15, "W")
    ic.rect(3, 26, 29, 28, "s")
    ic.line([(16, 1), (16, 6)], "S")
    ic.rect(17, 1, 21, 3, "r")
    return ic.outline()


def event_nominal():
    ic = Icon(32)
    sun(ic, 12, 12, 7)
    cloud(ic, 10, 14, 1)
    return ic.outline()


# ---------- 成就 ----------

def ach_first_orbit():
    ic = Icon(32)
    ic.poly([(8, 5), (24, 5), (22, 16), (16, 20), (10, 16)], "Y")
    ic.poly([(9, 6), (16, 6), (16, 19), (11, 15)], "y")
    ic.arc([3, 6, 11, 15], 90, 270, "Y", 2)
    ic.arc([21, 6, 29, 15], 270, 450, "Y", 2)
    ic.rect(15, 20, 17, 24, "Y")
    ic.rect(10, 24, 22, 27, "n")
    ic.rect(10, 24, 22, 24, "N")
    ic.px(11, 7, "Z")
    ic.px(11, 8, "Z")
    return ic.outline()


def ach_under_budget():
    ic = Icon(32)
    ic.circle(16, 16, 12, "Y")
    ic.circle(15, 15, 11, "y")
    ic.circle(16, 16, 8, "Y")
    ic.circle(15, 15, 8, "y")
    for dy, row in enumerate([".ww.", "w..w", "w...", ".ww.", "...w", "w..w", ".ww."]):
        for dx, v in enumerate(row):
            if v == "w":
                ic.px(14 + dx, 12 + dy, "Y")
    ic.line([(16, 10), (16, 20)], "Y")
    ic.px(9, 9, "Z")
    return ic.outline()


def ach_storm_survivor():
    ic = Icon(32)
    shield(ic, 6, 3, 20, 26, "c", "C", "L")
    bolt(ic, 11, 9, "y", "Y")
    return ic.outline()


def star(ic, cx, cy, r, c, cd):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    ic.poly(pts, cd)
    inner = [(cx + (x - cx) * 0.8 - 0.5, cy + (y - cy) * 0.8 - 0.5) for x, y in pts]
    ic.poly(inner, c)


def ach_all_rounder():
    ic = Icon(32)
    star(ic, 16, 17, 14, "y", "Y")
    ic.px(12, 12, "Z")
    ic.px(13, 11, "Z")
    return ic.outline()


def burst(ic, cx, cy, r):
    for (rr, c) in [(r, "r"), (r * 0.7, "o"), (r * 0.4, "y")]:
        pts = []
        for k in range(16):
            a = k * math.pi / 8
            q = rr if k % 2 == 0 else rr * 0.55
            pts.append((cx + math.cos(a) * q, cy + math.sin(a) * q))
        ic.poly(pts, c)
    ic.circle(cx, cy, max(1, int(r * 0.15)), "Z")


def ach_glorious_failure():
    ic = Icon(32)
    burst(ic, 16, 16, 15)
    return ic.outline()


def ach_never_give_up():
    ic = Icon(32)
    ic.arc([4, 4, 28, 28], 30, 300, "g", 4)
    ic.poly([(22, 3), (29, 9), (21, 12)], "g")
    ic.arc([5, 5, 27, 27], 30, 300, "G", 1)
    return ic.outline()


def ach_bare_bones():
    ic = Icon(32)
    ic.line([(6, 26), (22, 10)], "s", 4)
    ic.circle(24, 8, 5, "s")
    ic.rect(24, 3, 26, 8, (0, 0, 0, 0)) if False else None
    ic.poly([(23, 3), (27, 3), (25, 8)], "k")
    ic.line([(26, 26), (12, 12)], "n", 4)
    ic.line([(11, 11), (7, 7)], "s", 2)
    ic.line([(5, 25), (20, 10)], "l", 1)
    return ic.outline()


def ach_top_of_the_line():
    ic = Icon(32)
    ic.poly([(8, 6), (24, 6), (30, 13), (16, 29), (2, 13)], "C")
    ic.poly([(9, 7), (16, 7), (16, 27), (4, 13)], "c")
    ic.poly([(16, 7), (23, 7), (28, 13), (16, 27)], "L")
    ic.line([(2, 13), (30, 13)], "C")
    ic.line([(16, 7), (11, 13)], "w")
    return ic.outline()


def ach_so_close():
    ic = Icon(32)
    ic.circle(10, 12, 7, "r")
    ic.circle(22, 12, 7, "r")
    ic.poly([(3, 14), (29, 14), (16, 28)], "r")
    ic.circle(9, 10, 3, "p")
    ic.line([(16, 7), (13, 13), (18, 17), (14, 22), (16, 27)], "k", 2)
    return ic.outline()


def ach_crisis_management():
    ic = Icon(32)
    ic.rect(10, 9, 20, 28, "R")
    ic.rect(10, 9, 15, 28, "r")
    ic.ellipse(10, 6, 20, 12, "r")
    ic.rect(13, 3, 17, 7, "S")
    ic.line([(17, 4), (25, 4), (27, 9)], "S", 2)
    ic.rect(10, 16, 20, 20, "w")
    for x in (24, 27, 29):
        ic.px(x, 12, "w")
        ic.px(x - 1, 14, "W")
    return ic.outline()


def ach_flawless_mission():
    ic = Icon(32)
    for r, c in [(13, "r"), (10, "w"), (7, "r"), (4, "w"), (2, "r")]:
        ic.circle(15, 17, r, c)
    ic.line([(16, 16), (28, 4)], "n", 2)
    ic.poly([(26, 2), (30, 2), (30, 6)], "y")
    return ic.outline()


def ach_extended_mission():
    ic = Icon(32)
    ic.rect(7, 3, 25, 5, "n")
    ic.rect(7, 27, 25, 29, "n")
    ic.poly([(9, 6), (23, 6), (17, 16), (23, 26), (9, 26), (15, 16)], "L")
    ic.poly([(11, 8), (21, 8), (16, 14)], "y")
    ic.poly([(16, 18), (21, 25), (11, 25)], "y")
    ic.line([(16, 15), (16, 20)], "y")
    return ic.outline()


def ach_space_polymath():
    ic = Icon(32)
    ic.poly([(3, 10), (9, 17), (16, 6), (23, 17), (29, 10), (27, 25), (5, 25)], "Y")
    ic.poly([(4, 12), (9, 19), (16, 8), (16, 24), (6, 24)], "y")
    ic.rect(5, 23, 27, 27, "Y")
    for x, c in ((10, "r"), (16, "c"), (22, "g")):
        ic.circle(x, 25, 1, c)
    for x, y in ((3, 10), (16, 6), (29, 10)):
        ic.circle(x, y - 1, 2, "y")
    return ic.outline()


# ---------- 勳章、吉祥物、狀態 ----------

def medal_base(ic, c, cd, cl):
    ic.poly([(9, 2), (14, 2), (17, 14), (12, 14)], "r")
    ic.poly([(18, 2), (23, 2), (20, 14), (15, 14)], "R")
    ic.circle(16, 20, 10, cd)
    ic.circle(15, 19, 9, c)
    ic.circle(16, 20, 6, cd)
    ic.circle(15, 19, 6, c)
    ic.px(10, 15, cl)
    ic.px(11, 14, cl)


def medal_s_rank():
    ic = Icon(32)
    medal_base(ic, "y", "Y", "Z")
    text(ic, 14, 17, "S", "Y")
    return ic.outline()


def medal_frugal():
    ic = Icon(32)
    ic.circle(16, 12, 9, "Y")
    ic.circle(15, 11, 8, "y")
    ic.circle(13, 9, 3, "Z")
    ic.rect(12, 19, 20, 22, "y")
    ic.rect(12, 23, 20, 27, "s")
    ic.line([(12, 25), (20, 25)], "S")
    ic.rect(14, 28, 18, 29, "S")
    for (x1, y1, x2, y2) in [(2, 12, 4, 12), (28, 12, 30, 12), (5, 3, 6, 5), (27, 3, 26, 5)]:
        ic.line([(x1, y1), (x2, y2)], "y")
    return ic.outline()


def medal_robust():
    ic = Icon(32)
    shield(ic, 5, 3, 22, 27, "s", "S", "l")
    ic.line([(10, 16), (14, 21), (22, 10)], "g", 3)
    return ic.outline()


def medal_all_electric():
    ic = Icon(32)
    ic.circle(16, 16, 13, "B")
    ic.circle(15, 15, 12, "b")
    bolt(ic, 11, 7, "L", "c")
    return ic.outline()


def mascot_orbit():
    ic = Icon(32)
    ic.line([(16, 2), (16, 7)], "S", 1)
    ic.circle(16, 2, 2, "r")
    ic.rect(3, 13, 6, 21, "S")
    ic.rect(26, 13, 29, 21, "S")
    ic.d.rounded_rectangle([5, 7, 27, 27], radius=5, fill=P("s"))
    ic.d.rounded_rectangle([5, 7, 25, 25], radius=5, fill=P("l"))
    ic.d.rounded_rectangle([8, 11, 24, 21], radius=3, fill=P("d"))
    ic.rect(11, 14, 13, 17, "c")
    ic.rect(19, 14, 21, 17, "c")
    ic.px(11, 14, "L")
    ic.px(19, 14, "L")
    ic.line([(13, 23), (19, 23)], "S")
    ic.px(7, 9, "w")
    return ic.outline()


def alert():
    ic = Icon(32)
    for (x1, y1, x2, y2) in [(3, 8, 7, 10), (29, 8, 25, 10), (16, 1, 16, 4), (6, 2, 8, 5), (26, 2, 24, 5)]:
        ic.line([(x1, y1), (x2, y2)], "y", 2)
    ic.ellipse(8, 7, 24, 23, "R")
    ic.rect(8, 15, 24, 23, "R")
    ic.ellipse(8, 7, 22, 21, "r")
    ic.rect(8, 15, 22, 22, "r")
    ic.ellipse(11, 9, 15, 14, "p")
    ic.rect(5, 23, 27, 28, "S")
    ic.rect(5, 23, 27, 24, "s")
    return ic.outline()


def locked():
    ic = Icon(32)
    ic.arc([9, 3, 23, 19], 180, 360, "S", 3)
    ic.rect(9, 11, 11, 15, "S")
    ic.rect(21, 11, 23, 15, "S")
    ic.rect(6, 14, 26, 28, "Y")
    ic.rect(6, 14, 24, 26, "y")
    ic.rect(15, 18, 17, 23, "N")
    ic.circle(16, 18, 2, "N")
    return ic.outline()


def orbit_icon(geo):
    ic = Icon(48)
    if geo:
        ic.ellipse(2, 14, 45, 34, "C", outline=True)
        earth(ic, 24, 24, 6)
        satellite(ic, 41, 20)
    else:
        ic.arc([6, 16, 41, 34], 180, 360, "C")
        earth(ic, 24, 24, 13)
        ic.arc([6, 16, 41, 34], 0, 180, "c")
        satellite(ic, 38, 32)
    return ic.outline()


# ---------- 16×16 小圖示 ----------

def g_cost():
    ic = Icon(16)
    ic.circle(8, 8, 6, "Y")
    ic.circle(7, 7, 5, "y")
    text(ic, 6, 5, "$", "Y")
    return ic.outline()


def g_mass():
    ic = Icon(16)
    ic.poly([(2, 14), (13, 14), (11, 6), (4, 6)], "S")
    ic.poly([(3, 13), (8, 13), (8, 7), (5, 7)], "s")
    ic.arc([5, 2, 10, 8], 180, 360, "S", 2)
    return ic.outline()


def g_power():
    ic = Icon(16)
    ic.poly([(9, 1), (3, 9), (7, 9), (5, 15), (12, 6), (8, 6), (11, 1)], "y")
    ic.line([(9, 2), (5, 8)], "Z")
    return ic.outline()


def g_thermal():
    ic = Icon(16)
    ic.rect(6, 1, 9, 10, "w")
    ic.circle(7, 12, 3, "r")
    ic.rect(7, 5, 8, 11, "r")
    for y in (3, 5, 7):
        ic.px(10, y, "W")
    return ic.outline()


def g_data():
    ic = Icon(16)
    for i, h in enumerate((4, 7, 10, 13)):
        ic.rect(1 + i * 4, 15 - h, 3 + i * 4, 14, "c" if i < 3 else "C")
    return ic.outline()


def g_reserve():
    ic = Icon(16)
    ic.rect(1, 6, 14, 14, "R")
    ic.rect(1, 6, 13, 13, "r")
    ic.rect(5, 3, 10, 6, "S")
    ic.rect(6, 4, 9, 5, (0, 0, 0, 0)) if False else ic.rect(6, 4, 9, 5, "d")
    ic.rect(6, 9, 9, 10, "y")
    return ic.outline()


def g_dv():
    ic = Icon(16)
    ic.poly([(8, 1), (11, 5), (11, 11), (5, 11), (5, 5)], "l")
    ic.poly([(8, 1), (8, 11), (5, 11), (5, 5)], "w")
    ic.circle(8, 6, 1, "c")
    ic.poly([(5, 8), (2, 12), (5, 12)], "r")
    ic.poly([(11, 8), (14, 12), (11, 12)], "r")
    ic.rect(7, 12, 9, 14, "o")
    return ic.outline()


def g_check():
    ic = Icon(16)
    ic.line([(2, 8), (6, 12), (14, 3)], "g", 3)
    return ic.outline()


def g_cross():
    ic = Icon(16)
    ic.line([(3, 3), (13, 13)], "r", 3)
    ic.line([(13, 3), (3, 13)], "r", 3)
    return ic.outline()


def g_wait():
    ic = Icon(16)
    ic.rect(3, 1, 12, 2, "n")
    ic.rect(3, 13, 12, 14, "n")
    ic.poly([(4, 3), (11, 3), (8, 8), (11, 12), (4, 12), (7, 8)], "L")
    ic.poly([(5, 4), (10, 4), (7, 7)], "y")
    ic.poly([(7, 10), (10, 12), (5, 12)], "y")
    return ic.outline()


def g_signal():
    ic = Icon(16)
    ic.rect(7, 8, 8, 14, "s")
    ic.circle(7, 7, 1, "g")
    for r in (3, 6):
        ic.arc([7 - r, 7 - r, 8 + r, 8 + r], 200, 340, "g", 1)
    return ic.outline()


def g_tip():
    ic = Icon(16)
    ic.circle(8, 6, 5, "y")
    ic.circle(7, 5, 2, "Z")
    ic.rect(6, 10, 10, 11, "y")
    ic.rect(6, 12, 10, 14, "s")
    return ic.outline()


def g_ban():
    ic = Icon(16)
    ic.d.ellipse([1, 1, 14, 14], outline=P("r"), width=2)
    ic.line([(4, 4), (11, 11)], "r", 2)
    return ic.outline()


def g_book():
    ic = Icon(16)
    ic.rect(1, 3, 7, 13, "w")
    ic.rect(8, 3, 14, 13, "W")
    ic.rect(7, 3, 8, 14, "C")
    for y in (5, 7, 9):
        ic.line([(2, y), (6, y)], "S")
        ic.line([(9, y), (13, y)], "S")
    return ic.outline()


def g_warn():
    ic = Icon(16)
    ic.poly([(8, 1), (15, 14), (1, 14)], "y")
    ic.rect(7, 5, 8, 10, "k")
    ic.rect(7, 12, 8, 12, "k")
    return ic.outline()


def g_star():
    ic = Icon(16)
    star(ic, 8, 8, 7, "y", "Y")
    return ic.outline()


def g_add():
    ic = Icon(16)
    ic.rect(7, 2, 8, 13, "c")
    ic.rect(2, 7, 13, 8, "c")
    return ic.outline()


ICONS = {
    "objective-imaging": objective_imaging,
    "objective-climate": objective_climate,
    "objective-weather": objective_weather,
    "objective-comms": objective_comms,
    "event-solar_flare": event_solar_flare,
    "event-geomagnetic_storm": event_geomagnetic_storm,
    "event-bad_weather": event_bad_weather,
    "event-small_debris": event_small_debris,
    "event-orbital_congestion": event_orbital_congestion,
    "event-limited_ground_station": event_limited_ground_station,
    "event-mass_growth": event_mass_growth,
    "event-budget_cut": event_budget_cut,
    "event-export_control": event_export_control,
    "event-launch_manifest": event_launch_manifest,
    "event-flagship": event_flagship,
    "event-nominal": event_nominal,
    "achievement-first_orbit": ach_first_orbit,
    "achievement-under_budget": ach_under_budget,
    "achievement-storm_survivor": ach_storm_survivor,
    "achievement-all_rounder": ach_all_rounder,
    "achievement-glorious_failure": ach_glorious_failure,
    "achievement-never_give_up": ach_never_give_up,
    "achievement-bare_bones": ach_bare_bones,
    "achievement-top_of_the_line": ach_top_of_the_line,
    "achievement-so_close": ach_so_close,
    "achievement-crisis_management": ach_crisis_management,
    "achievement-flawless_mission": ach_flawless_mission,
    "achievement-extended_mission": ach_extended_mission,
    "achievement-space_polymath": ach_space_polymath,
    "medal-s_rank": medal_s_rank,
    "medal-frugal": medal_frugal,
    "medal-robust": medal_robust,
    "medal-all_electric": medal_all_electric,
    "mascot-orbit": mascot_orbit,
    "alert": alert,
    "locked": locked,
    "orbit-leo": lambda: orbit_icon(False),
    "orbit-geo": lambda: orbit_icon(True),
    "glyph-cost": g_cost,
    "glyph-mass": g_mass,
    "glyph-power": g_power,
    "glyph-thermal": g_thermal,
    "glyph-data": g_data,
    "glyph-reserve": g_reserve,
    "glyph-dv": g_dv,
    "glyph-check": g_check,
    "glyph-cross": g_cross,
    "glyph-wait": g_wait,
    "glyph-signal": g_signal,
    "glyph-tip": g_tip,
    "glyph-ban": g_ban,
    "glyph-book": g_book,
    "glyph-warn": g_warn,
    "glyph-star": g_star,
    "glyph-add": g_add,
}


# ---------- 火箭尾焰（3 格輪播的精靈圖，存到 image/rocket/exhaust.png）----------
# 每格 8×14，顯示時放大 3 倍，接近火箭圖本身的像素大小。顏色由噴嘴往下：白熱 → 黃 → 橙 → 紅

EXHAUST_FRAMES = [
    [
        ".LwwwwL.",
        ".wZZZZw.",
        ".yZZZZy.",
        ".yyZZyy.",
        ".oyyyyo.",
        "..oyyo..",
        "..oyyo..",
        "..ooyo..",
        "..rooo..",
        "...oo...",
        "...ro...",
        "...rr...",
        "....r...",
        "........",
    ],
    [
        ".LwwwwL.",
        "LwZZZZwL",
        "yyZZZZyy",
        ".yyZZyy.",
        ".oyyyyo.",
        ".ooyyoo.",
        "..oyyo..",
        "..roor..",
        "...oo...",
        "...rr...",
        "...r....",
        "........",
        "........",
        "........",
    ],
    [
        ".LwwwwL.",
        ".wZZZZw.",
        ".yZZZZy.",
        ".yZZZyy.",
        ".yyZyyo.",
        ".oyyyo..",
        "..oyyo..",
        "..oyoo..",
        "..ooor..",
        "..roo...",
        "...or...",
        "...rr...",
        "...r....",
        "....r...",
    ],
]

EXHAUST_COLORS = {
    "L": (255, 255, 255, 255),
    "w": (255, 251, 232, 255),
    "Z": (255, 241, 184, 255),
    "y": (255, 209, 102, 255),
    "o": (255, 159, 67, 255),
    "r": (255, 85, 102, 255),
}


def exhaust_sheet():
    w, h = 8, 14
    sheet = Image.new("RGBA", (w * len(EXHAUST_FRAMES), h), (0, 0, 0, 0))
    for i, frame in enumerate(EXHAUST_FRAMES):
        for y, row in enumerate(frame):
            for x, ch in enumerate(row):
                if ch != ".":
                    sheet.putpixel((i * w + x, y), EXHAUST_COLORS[ch])
    return sheet


def main():
    os.makedirs(OUT, exist_ok=True)
    exhaust_sheet().save(os.path.join(os.path.dirname(__file__), "..", "image", "rocket", "exhaust.png"))
    images = {}
    for name, fn in ICONS.items():
        im = fn().im
        im.save(os.path.join(OUT, f"{name}.png"))
        images[name] = im

    # 預覽圖：每個圖示放大 3 倍排成表格
    cell = 108
    cols = 10
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (20, 24, 60, 255))
    for i, (name, im) in enumerate(images.items()):
        scale = 3 if im.size[0] >= 32 else 5
        big = im.resize((im.size[0] * scale, im.size[1] * scale), Image.NEAREST)
        if big.size[0] > cell - 4:
            big = im.resize((cell - 8, cell - 8), Image.NEAREST)
        x = (i % cols) * cell + (cell - big.size[0]) // 2
        y = (i // cols) * cell + (cell - big.size[1]) // 2
        sheet.paste(big, (x, y), big)
    sheet.save(os.path.join(os.path.dirname(__file__), "icons_preview.png"))
    print(f"ok: {len(images)} icons")


if __name__ == "__main__":
    main()

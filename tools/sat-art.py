"""產生衛星設計圖、PSLV 火箭、電離層酬載的像素圖。

- image/rocket/blueprint-sat-{optical,transponder,plasma}.png：選件畫面的衛星線稿（160×160 畫好後放大 2 倍）。
  零件熱點放在真實位置：太陽能板在兩翼、推進器噴嘴在背向地球的頂面、相機／天線朝向地球（畫面下方）。
  熱點座標寫在 js/selection.js 的 HOTSPOT_DEFS，改圖時要一起改。
- image/rocket/rocket-pslv.png：致敬印度 PSLV-XL（核心級＋兩側固體捆綁助推器、略寬的整流罩），16×32 格放大 10 倍。
- image/parts/payload-plasma-*.png：電離層電漿儀器（朗繆爾探針／福衛五號 AIP 級電漿探測儀／AIP＋GNSS 掩星接收機）。

用法：py tools/sat-art.py
"""

import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "image")

LINE = (79, 209, 255, 255)
DIM = (79, 209, 255, 120)
EARTH = (42, 111, 209, 200)


# ---------- 衛星設計圖 ----------

def dashed_rect(d, x0, y0, x1, y1, c, dash=3):
    for x in range(x0, x1 + 1):
        if (x // dash) % 2 == 0:
            d.point((x, y0), fill=c)
            d.point((x, y1), fill=c)
    for y in range(y0, y1 + 1):
        if (y // dash) % 2 == 0:
            d.point((x0, y), fill=c)
            d.point((x1, y), fill=c)


def dashed_circle(d, cx, cy, r, c, steps=None):
    steps = steps or max(12, int(r * 4))
    for i in range(steps):
        if i % 2:
            continue
        a0 = 2 * math.pi * i / steps
        a1 = 2 * math.pi * (i + 1) / steps
        d.line([(cx + r * math.cos(a0), cy + r * math.sin(a0)), (cx + r * math.cos(a1), cy + r * math.sin(a1))], fill=c)


def solar_wing(d, x0, y0, x1, y1):
    d.rectangle([x0, y0, x1, y1], outline=LINE)
    for x in range(x0 + 6, x1, 6):
        d.line([(x, y0), (x, y1)], fill=DIM)
    for y in range(y0 + 6, y1, 6):
        d.line([(x0, y), (x1, y)], fill=DIM)


def blueprint(kind):
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 地球（畫面下方的地平線弧）
    d.arc([-170, 146, 330, 560], 245, 295, fill=EARTH, width=1)

    # 本體：鋁蜂巢板的箱型結構，虛線是內部的承力斜撐
    d.rectangle([55, 45, 105, 110], outline=LINE)
    d.line([(55, 45), (60, 50)], fill=LINE)
    d.line([(105, 45), (100, 50)], fill=LINE)
    d.rectangle([60, 50, 100, 105], outline=DIM)
    d.line([(60, 105), (80, 85)], fill=DIM)

    # 推進：內部的推進劑貯箱＋頂面（背向地球）的噴嘴
    dashed_circle(d, 72, 70, 9, DIM)
    d.line([(72, 61), (72, 50), (80, 50), (80, 45)], fill=DIM)
    d.polygon([(77, 45), (83, 45), (87, 33), (73, 33)], outline=LINE)
    d.line([(74, 37), (86, 37)], fill=DIM)

    # 姿態：三顆反應輪（虛線）＋頂面右側的星象儀與遮光罩
    for cx, cy in ((90, 58), (95, 68), (90, 78)):
        dashed_circle(d, cx, cy, 4, DIM, steps=12)
    d.rectangle([95, 38, 101, 45], outline=LINE)
    d.polygon([(96, 38), (100, 38), (103, 31), (93, 31)], outline=LINE)

    # 電力：兩側太陽能板＋支架
    d.line([(105, 78), (113, 78)], fill=LINE)
    d.line([(47, 78), (55, 78)], fill=LINE)
    solar_wing(d, 113, 66, 152, 90)
    solar_wing(d, 8, 66, 47, 90)

    # 通訊：本體左下的伸展桿與朝地碟形天線
    d.line([(58, 110), (46, 120)], fill=LINE)
    d.arc([34, 118, 54, 134], 180, 360, fill=LINE)
    d.line([(34, 126), (54, 126)], fill=DIM)
    d.polygon([(43, 126), (45, 126), (44, 130)], outline=DIM)

    # 酬載：依任務類型不同
    if kind == "optical":
        # 朝地望遠鏡：鏡筒＋遮光罩，開口向下
        d.rectangle([76, 110, 98, 132], outline=LINE)
        d.line([(76, 132), (73, 138)], fill=LINE)
        d.line([(98, 132), (101, 138)], fill=LINE)
        d.line([(73, 138), (101, 138)], fill=DIM)
        d.ellipse([81, 115, 93, 127], outline=DIM)
    elif kind == "transponder":
        # 地球面板上的轉發器艙＋兩面朝地的大型反射器（饋源喇叭在焦點）
        d.rectangle([70, 110, 104, 117], outline=LINE)
        for x in range(74, 102, 5):
            d.line([(x, 112), (x, 115)], fill=DIM)
        for x0 in (60, 92):
            d.line([(x0 + 11, 117), (x0 + 11, 121)], fill=DIM)
            d.arc([x0, 121, x0 + 22, 141], 180, 360, fill=LINE)
            d.line([(x0, 131), (x0 + 22, 131)], fill=DIM)
            d.polygon([(x0 + 10, 131), (x0 + 12, 131), (x0 + 13, 135), (x0 + 9, 135)], outline=LINE)
    else:
        # 電漿探測儀裝在迎風面（飛行方向），底部是 GNSS 掩星天線陣列
        d.rectangle([44, 92, 55, 104], outline=LINE)
        d.ellipse([46, 95, 52, 101], outline=LINE)
        d.line([(40, 98), (44, 98)], fill=DIM)
        d.rectangle([74, 110, 100, 120], outline=LINE)
        for x in range(77, 99, 6):
            d.rectangle([x, 113, x + 3, 117], outline=DIM)
        # 飛行方向箭頭
        d.line([(14, 40), (34, 40)], fill=DIM)
        d.line([(14, 40), (19, 36)], fill=DIM)
        d.line([(14, 40), (19, 44)], fill=DIM)

    return im.resize((320, 320), Image.NEAREST)


# ---------- PSLV ----------

PSLV_COLORS = {
    "W": (244, 246, 252, 255),
    "w": (214, 219, 230, 255),
    "s": (172, 178, 192, 255),
    "S": (126, 132, 148, 255),
    "d": (74, 78, 94, 255),
    "k": (30, 32, 44, 255),
    "b": (79, 160, 230, 255),
}


def shade(width, i):
    # 光源在左：最左亮、最右暗
    if i == 0:
        return "W"
    if i == width - 1:
        return "d"
    if i >= width - 2:
        return "S"
    if i >= width * 0.6:
        return "s"
    return "w"


def pslv():
    W, H = 16, 32
    grid = [["." for _ in range(W)] for _ in range(H)]

    def body(x0, x1, y0, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                grid[y][x] = shade(x1 - x0 + 1, x - x0)

    # 整流罩：比核心級略寬，尖拱頭
    for y, (x0, x1) in enumerate([(7, 8), (6, 9), (5, 10), (5, 10), (4, 11), (4, 11), (4, 11), (4, 11), (5, 10)]):
        body(x0, x1, y, y)
    # 核心級（四節：固體－液體－固體－液體）
    body(5, 10, 9, 29)
    for y in (9, 15, 21):
        for x in range(5, 11):
            grid[y][x] = "k" if x in (5, 10) else "d"
    for x in range(6, 10):
        grid[12][x] = "b"
    # 兩側的固體捆綁助推器（PSLV-XL 共 6 具，側面看得到 2 具）
    for x0 in (1, 12):
        grid[15][x0 + 1] = "w"
        body(x0, x0 + 2, 16, 16)
        grid[16][x0] = "."
        grid[16][x0 + 2] = "."
        grid[16][x0 + 1] = "W" if x0 == 1 else "s"
        body(x0, x0 + 2, 17, 29)
        for x in range(x0, x0 + 3):
            grid[23][x] = "d"
        grid[30][x0 + 1] = "k"
    # 核心級噴嘴
    for x in range(6, 10):
        grid[30][x] = "k"
    for x in range(7, 9):
        grid[31][x] = "d"

    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch != ".":
                im.putpixel((x, y), PSLV_COLORS[ch])
    return im.resize((W * 10, H * 10), Image.NEAREST)


# ---------- 電離層酬載（32×32 畫好後放大 2 倍）----------

C = {
    "k": (11, 14, 31, 255),
    "w": (232, 236, 255, 255),
    "l": (223, 229, 238, 255),
    "s": (162, 170, 182, 255),
    "S": (92, 99, 112, 255),
    "y": (255, 209, 102, 255),
    "Y": (209, 139, 31, 255),
    "Z": (255, 241, 184, 255),
    "c": (79, 209, 255, 255),
    "C": (31, 127, 179, 255),
    "o": (196, 98, 26, 255),
}


def canvas():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def sensor_box(d, x0, y0, x1, y1):
    # 金色多層隔熱毯包覆的電子箱，正面是圓形柵網開口（平面朗繆爾探針＋阻滯電位分析儀）
    d.rectangle([x0, y0, x1, y1], fill=C["Y"])
    d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=C["y"])
    d.line([(x0 + 1, y0 + 1), (x0 + 1, y1 - 2)], fill=C["Z"])
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    r = min(x1 - x0, y1 - y0) // 2 - 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C["S"])
    d.ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=C["C"])
    for k in range(-r + 2, r - 1, 2):
        d.line([(cx + k, cy - r + 1), (cx + k, cy + r - 1)], fill=C["c"])
    d.point((cx - r + 2, cy - r + 2), fill=C["w"])


def plasma_economy():
    # 多針朗繆爾探針：伸展桿末端四根細針（立方衛星常用）
    im, d = canvas()
    d.rectangle([4, 22, 11, 27], fill=C["S"])
    d.rectangle([4, 22, 10, 26], fill=C["s"])
    d.line([(10, 22), (22, 10)], fill=C["s"], width=2)
    d.line([(11, 23), (23, 11)], fill=C["S"])
    for i, (x, y) in enumerate([(22, 6), (25, 8), (27, 11), (28, 14)]):
        d.line([(22, 10), (x, y)], fill=C["l"])
        d.point((x, y), fill=C["y"])
    return im


def plasma_standard():
    im, d = canvas()
    sensor_box(d, 6, 8, 25, 25)
    d.rectangle([9, 26, 22, 28], fill=C["S"])
    return im


def plasma_premium():
    im, d = canvas()
    sensor_box(d, 2, 10, 15, 23)
    # GNSS 掩星天線：白色面板上的銅色貼片陣列
    d.rectangle([17, 4, 30, 28], fill=C["s"])
    d.rectangle([17, 4, 29, 27], fill=C["l"])
    for y in range(6, 26, 5):
        for x in (19, 24):
            d.rectangle([x, y, x + 3, y + 2], fill=C["o"])
            d.point((x, y), fill=C["y"])
    d.line([(15, 16), (17, 16)], fill=C["S"])
    return im


def main():
    for kind in ("optical", "transponder", "plasma"):
        blueprint(kind).save(os.path.join(ROOT, "rocket", f"blueprint-sat-{kind}.png"))
    pslv().save(os.path.join(ROOT, "rocket", "rocket-pslv.png"))
    for tier, fn in (("economy", plasma_economy), ("standard", plasma_standard), ("premium", plasma_premium)):
        fn().resize((64, 64), Image.NEAREST).save(os.path.join(ROOT, "parts", f"payload-plasma-{tier}.png"))
    print("ok")


if __name__ == "__main__":
    main()

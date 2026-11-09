"""產生衛星電腦三個等級的零件圖（image/parts/computer-*.png）。

和 tools/sat-art.py 的電漿儀器同一套畫法：32×32 畫好後最近鄰放大 2 倍成 64×64，色盤沿用同一組。
- economy：GomSpace NanoMind A3200 級——一片小小的綠色立方衛星電路板
- standard：EnduroSat OBC 級＋固態記錄器——疊起來的電路板旁邊多一個大容量儲存盒
- premium：BAE RAD750 3U CompactPCI 級——兩台厚外殼的抗輻射電腦機箱（雙機備份）

用法：py tools/computer-art.py
"""

import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "image", "parts")

C = {
    "k": (11, 14, 31, 255),
    "w": (232, 236, 255, 255),
    "l": (223, 229, 238, 255),
    "s": (162, 170, 182, 255),
    "S": (92, 99, 112, 255),
    "y": (255, 209, 102, 255),
    "Y": (209, 139, 31, 255),
    "c": (79, 209, 255, 255),
    "C": (31, 127, 179, 255),
    "g": (60, 160, 96, 255),  # 電路板
    "G": (28, 96, 60, 255),
    "r": (255, 85, 102, 255),
}


def canvas():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def chip(d, x0, y0, x1, y1):
    # 黑色晶片，兩側金色接腳
    d.rectangle([x0, y0, x1, y1], fill=C["k"])
    d.point((x0 + 1, y0 + 1), fill=C["S"])
    for y in range(y0 + 1, y1, 2):
        d.point((x0 - 1, y), fill=C["y"])
        d.point((x1 + 1, y), fill=C["y"])


def board(d, x0, y0, x1, y1):
    d.rectangle([x0, y0, x1, y1], fill=C["G"])
    d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=C["g"])
    for (x, y) in ((x0 + 1, y0 + 1), (x1 - 2, y0 + 1), (x0 + 1, y1 - 2), (x1 - 2, y1 - 2)):
        d.point((x, y), fill=C["s"])  # 固定孔


def computer_economy():
    im, d = canvas()
    board(d, 7, 7, 24, 24)
    chip(d, 11, 11, 17, 17)
    d.rectangle([19, 12, 21, 14], fill=C["k"])  # 記憶體
    d.rectangle([9, 21, 22, 22], fill=C["Y"])  # 排針
    for x in range(9, 23, 2):
        d.point((x, 21), fill=C["y"])
    d.point((20, 19), fill=C["c"])  # 狀態燈
    return im


def computer_standard():
    im, d = canvas()
    # 三片疊起來的電路板（側視），中間用銅柱撐開
    for i, y in enumerate((8, 14, 20)):
        d.rectangle([3, y, 18, y + 2], fill=C["G"])
        d.rectangle([3, y, 18, y + 1], fill=C["g"])
        d.rectangle([7, y - 2, 11, y - 1], fill=C["k"])
    for x in (4, 17):
        d.line([(x, 6), (x, 24)], fill=C["Y"])
    d.rectangle([3, 25, 18, 26], fill=C["S"])
    # 固態記錄器：銀色儲存盒，正面一排藍色指示燈
    d.rectangle([20, 8, 29, 26], fill=C["S"])
    d.rectangle([20, 8, 28, 25], fill=C["s"])
    d.line([(21, 9), (21, 24)], fill=C["l"])
    for y in range(11, 24, 3):
        d.rectangle([23, y, 26, y + 1], fill=C["C"])
        d.point((23, y), fill=C["c"])
    return im


def rad_box(d, x0, y0, x1, y1):
    # 抗輻射機箱：厚鋁外殼（深灰邊）＋散熱鰭片＋金色連接器
    d.rectangle([x0, y0, x1, y1], fill=C["k"])
    d.rectangle([x0 + 1, y0 + 1, x1 - 1, y1 - 1], fill=C["S"])
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=C["s"])
    d.line([(x0 + 2, y0 + 2), (x0 + 2, y1 - 3)], fill=C["l"])
    for y in range(y0 + 4, y1 - 5, 2):
        d.line([(x0 + 4, y), (x1 - 3, y)], fill=C["S"])
    d.rectangle([x0 + 3, y1 - 4, x1 - 3, y1 - 3], fill=C["Y"])
    for x in range(x0 + 3, x1 - 2, 2):
        d.point((x, y1 - 4), fill=C["y"])


def computer_premium():
    im, d = canvas()
    rad_box(d, 2, 5, 15, 27)
    rad_box(d, 16, 5, 29, 27)
    # 兩台互為備份，中間的交叉連線
    d.line([(14, 9), (17, 9)], fill=C["c"])
    d.point((8, 7), fill=C["c"])
    d.point((22, 7), fill=C["r"])
    return im


def main():
    for tier, fn in (("economy", computer_economy), ("standard", computer_standard), ("premium", computer_premium)):
        fn().resize((64, 64), Image.NEAREST).save(os.path.join(ROOT, f"computer-{tier}.png"))
    print("ok")


if __name__ == "__main__":
    main()

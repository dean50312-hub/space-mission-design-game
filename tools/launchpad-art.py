"""產生發射階段開場的發射場像素圖（image/ui/launchpad.png）。

構圖參考真實的發射場：紅色鋼構勤務塔與擺臂、發射台與導焰槽、兩支避雷塔與避雷線、
地面控制碉堡、遠方山丘。火箭本身不畫在圖上（遊戲裡另外疊上火箭圖），
發射台中心對準圖片正中央，台面位於 PAD_SURFACE_Y。

用法：py tools/launchpad-art.py
"""

import os

from PIL import Image, ImageDraw

W, H = 360, 90  # 顯示時放大 2 倍（720 px），蓋滿桌機版的發射畫面寬度
PAD_SURFACE_Y = 62  # 遊戲用這個高度對齊火箭底部（js/simulation.js 的 LAUNCHPAD_SURFACE_RATIO）
CX = W // 2

HILL_FAR = (52, 96, 118, 255)
HILL_NEAR = (44, 112, 76, 255)
GRASS = (62, 132, 62, 255)
GRASS_DARK = (48, 110, 52, 255)
CONCRETE = (168, 168, 160, 255)
CONCRETE_DARK = (120, 120, 116, 255)
TRENCH = (40, 40, 46, 255)
TOWER = (196, 58, 48, 255)
TOWER_DARK = (140, 38, 34, 255)
STEEL = (150, 156, 166, 255)
STEEL_DARK = (96, 100, 112, 255)
WIRE = (70, 74, 88, 255)
BUNKER = (190, 184, 168, 255)
BUNKER_DARK = (140, 134, 120, 255)
LIGHT = (255, 214, 102, 255)


def main():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # 遠方山丘（兩層）
    far = [(0, 52)] + [(x, 46 + (x * 7) % 9 - (4 if (x // 30) % 2 else 0)) for x in range(18, W, 22)] + [(W, 48), (W, 60), (0, 60)]
    near = [(0, 56)] + [(x, 52 + (x * 5) % 5) for x in range(26, W, 29)] + [(W, 53), (W, 62), (0, 62)]
    d.polygon(far, fill=HILL_FAR)
    d.polygon(near, fill=HILL_NEAR)

    # 地面
    d.rectangle([0, PAD_SURFACE_Y, W, H], fill=GRASS)
    for x in range(0, W, 7):
        d.point((x + (x * 3) % 5, PAD_SURFACE_Y + 3 + (x % 4)), fill=GRASS_DARK)
        d.point((x + 2, PAD_SURFACE_Y + 12 + (x % 6)), fill=GRASS_DARK)

    # 發射台：混凝土台面 + 中央導焰槽
    d.polygon([(CX - 34, PAD_SURFACE_Y), (CX + 34, PAD_SURFACE_Y), (CX + 42, PAD_SURFACE_Y + 6), (CX - 42, PAD_SURFACE_Y + 6)], fill=CONCRETE)
    d.rectangle([CX - 42, PAD_SURFACE_Y + 6, CX + 42, PAD_SURFACE_Y + 8], fill=CONCRETE_DARK)
    d.rectangle([CX - 9, PAD_SURFACE_Y + 1, CX + 9, PAD_SURFACE_Y + 5], fill=TRENCH)
    # 通往發射台的道路
    d.polygon([(CX + 40, PAD_SURFACE_Y + 8), (CX + 52, PAD_SURFACE_Y + 8), (W, H), (W - 26, H)], fill=CONCRETE_DARK)

    # 勤務塔（在火箭左邊），紅色鋼構桁架
    tx0, tx1, ty = CX - 30, CX - 20, 6
    d.rectangle([tx0, ty, tx1, PAD_SURFACE_Y], outline=TOWER)
    for y in range(ty, PAD_SURFACE_Y, 6):
        d.line([(tx0, y), (tx1, y)], fill=TOWER)
        d.line([(tx0, y), (tx1, min(PAD_SURFACE_Y, y + 6))], fill=TOWER_DARK)
    d.line([(tx0 - 1, ty), (tx0 - 1, PAD_SURFACE_Y)], fill=TOWER_DARK)
    # 塔頂的避雷針與航空障礙燈
    d.line([(CX - 25, ty - 5), (CX - 25, ty)], fill=STEEL)
    d.point((CX - 25, ty - 6), fill=LIGHT)
    # 擺臂（伸向火箭上段與中段）
    for y in (16, 34):
        d.rectangle([tx1, y, CX - 6, y + 2], fill=STEEL)
        d.line([(tx1, y + 3), (CX - 6, y + 3)], fill=STEEL_DARK)

    # 兩支避雷塔，用避雷線連到勤務塔頂
    for x in (CX - 62, CX + 62):
        d.rectangle([x - 1, 18, x + 1, PAD_SURFACE_Y], fill=STEEL_DARK)
        d.line([(x, 14), (x, 18)], fill=STEEL)
    d.line([(CX - 62, 15), (CX - 25, ty - 3)], fill=WIRE)
    d.line([(CX + 62, 15), (CX - 25, ty - 3)], fill=WIRE)

    # 地面控制碉堡與水塔
    d.rectangle([CX + 70, PAD_SURFACE_Y - 8, CX + 92, PAD_SURFACE_Y], fill=BUNKER)
    d.rectangle([CX + 70, PAD_SURFACE_Y - 9, CX + 92, PAD_SURFACE_Y - 8], fill=BUNKER_DARK)
    for x in range(CX + 73, CX + 90, 5):
        d.rectangle([x, PAD_SURFACE_Y - 5, x + 2, PAD_SURFACE_Y - 4], fill=TRENCH)
    d.rectangle([CX - 88, PAD_SURFACE_Y - 22, CX - 78, PAD_SURFACE_Y - 15], fill=STEEL)
    d.line([(CX - 87, PAD_SURFACE_Y - 15), (CX - 87, PAD_SURFACE_Y)], fill=STEEL_DARK)
    d.line([(CX - 79, PAD_SURFACE_Y - 15), (CX - 79, PAD_SURFACE_Y)], fill=STEEL_DARK)

    out = os.path.join(os.path.dirname(__file__), "..", "image", "ui", "launchpad.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out)
    im.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(os.path.dirname(__file__), "..", "launchpad_preview.png"))
    print("ok", out)


if __name__ == "__main__":
    main()

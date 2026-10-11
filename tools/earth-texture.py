"""把 Natural Earth 的海岸線轉成運作期軌道畫面用的北半球像素地圖（js/earthmap.js）。

用法：
  1. 從 https://www.naturalearthdata.com/ 下載 ne_110m_land.zip 與 ne_110m_glaciated_areas.zip（公有領域）
  2. py tools/earth-texture.py <放 zip 的資料夾>

輸出的每一格是 0 海洋、1 陸地、2 冰原（格陵蘭等）、3 海冰。
只需要北半球：畫面是從北極正上方俯視，赤道就是地球的邊緣。
"""

import io
import os
import struct
import sys
import zipfile

import numpy as np
from matplotlib.path import Path

W = 192  # 經度方向，每格 1.875°
H = 48  # 緯度 90°N → 0°，每格 1.875°
SEA_ICE_LATITUDE = 77  # 海冰：取 3 月最大與 9 月最小範圍之間的概略邊界（遊戲估算）

OCEAN, LAND, GLACIER, SEA_ICE = 0, 1, 2, 3


def read_polygons(zip_path):
    """讀 .shp 裡的多邊形（shape type 5），回傳每個多邊形的 ring 列表。"""
    with zipfile.ZipFile(zip_path) as z:
        name = next(n for n in z.namelist() if n.endswith(".shp"))
        data = z.read(name)
    pos = 100
    polygons = []
    while pos < len(data):
        _, length = struct.unpack(">ii", data[pos : pos + 8])
        content = data[pos + 8 : pos + 8 + length * 2]
        pos += 8 + length * 2
        shape_type = struct.unpack("<i", content[:4])[0]
        if shape_type != 5:
            continue
        num_parts, num_points = struct.unpack("<ii", content[36:44])
        parts = list(struct.unpack(f"<{num_parts}i", content[44 : 44 + 4 * num_parts]))
        pts_start = 44 + 4 * num_parts
        pts = np.frombuffer(content[pts_start : pts_start + 16 * num_points], dtype="<f8").reshape(-1, 2)
        parts.append(num_points)
        polygons.append([pts[parts[i] : parts[i + 1]] for i in range(num_parts)])
    return polygons


def rasterize(polygons, lon, lat):
    """偶奇規則：一個點落在奇數個 ring 裡就算在多邊形內（洞會被扣掉）。"""
    points = np.column_stack([lon.ravel(), lat.ravel()])
    mask = np.zeros(len(points), dtype=bool)
    for rings in polygons:
        inside = np.zeros(len(points), dtype=bool)
        for ring in rings:
            inside ^= Path(ring).contains_points(points)
        mask |= inside
    return mask.reshape(lon.shape)


def main(folder):
    lons = -180 + (np.arange(W) + 0.5) * 360 / W
    lats = 90 - (np.arange(H) + 0.5) * 90 / H
    lon, lat = np.meshgrid(lons, lats)

    land = rasterize(read_polygons(os.path.join(folder, "ne_110m_land.zip")), lon, lat)
    glacier = rasterize(read_polygons(os.path.join(folder, "ne_110m_glaciated_areas.zip")), lon, lat)

    grid = np.full((H, W), OCEAN, dtype=int)
    grid[(~land) & (lat >= SEA_ICE_LATITUDE)] = SEA_ICE
    grid[land] = LAND
    grid[land & glacier] = GLACIER

    # 逐列做 run-length 編碼：類別數字 + 36 進位長度，以逗號分隔
    rows = []
    for y in range(H):
        row, x = [], 0
        while x < W:
            v = grid[y, x]
            run = 1
            while x + run < W and grid[y, x + run] == v:
                run += 1
            row.append(f"{v}{np.base_repr(run, 36).lower()}")
            x += run
        rows.append(",".join(row))

    out = os.path.join(os.path.dirname(__file__), "..", "js", "earthmap.js")
    with io.open(out, "w", encoding="utf8", newline="\n") as f:
        f.write("// 由 tools/earth-texture.py 從 Natural Earth 1:110m 海岸線產生（公有領域），請勿手動修改。\n")
        f.write(f"// 北半球經緯度格點 {W}×{H}（經度從 180°W 起，緯度從 90°N 起），0 海洋、1 陸地、2 冰原、3 海冰。\n")
        f.write(f"const EARTH_MAP = {{ W: {W}, H: {H}, rows: [\n")
        for r in rows:
            f.write(f'  "{r}",\n')
        f.write("] };\n")

    for y in range(0, H, 2):
        print("".join(" .#~"[v] if v != OCEAN else " " for v in grid[y, ::2]))


if __name__ == "__main__":
    main(sys.argv[1])

"""사과 아이콘 PNG 두 종을 생성한다. 외부 SVG 변환기 없이 Pillow만 쓴다.

실행 위치와 무관하게 항상 저장소의 assets/ 폴더에 저장한다.
- cd tools && python3 make_icons.py
- python3 tools/make_icons.py
모두 동일한 결과를 생성한다.
"""
import os
from PIL import Image, ImageDraw

BG = (250, 245, 235)
RED = (198, 40, 40)
RED_DARK = (150, 25, 25)
LEAF = (67, 130, 60)
STEM = (94, 63, 40)


def draw_apple(size: int) -> Image.Image:
    im = Image.new("RGBA", (size, size), BG + (255,))
    d = ImageDraw.Draw(im)
    s = size / 100.0

    def box(x1, y1, x2, y2):
        return [x1 * s, y1 * s, x2 * s, y2 * s]

    # 좌우 두 덩어리를 겹쳐 사과 실루엣을 만든다
    d.ellipse(box(12, 30, 60, 88), fill=RED)
    d.ellipse(box(40, 30, 88, 88), fill=RED)
    d.ellipse(box(26, 26, 74, 70), fill=RED)
    # 오른쪽 아래에 그림자
    d.ellipse(box(52, 46, 84, 84), fill=RED_DARK)
    d.ellipse(box(16, 34, 56, 84), fill=RED)
    # 꼭지
    d.line([50 * s, 30 * s, 52 * s, 14 * s], fill=STEM, width=max(2, int(4 * s)))
    # 잎
    d.ellipse(box(52, 10, 76, 26), fill=LEAF)
    return im


ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

for n in (192, 512):
    output_path = os.path.join(ASSETS_DIR, f"icon-{n}.png")
    draw_apple(n).save(output_path)
    print(f"icon-{n}.png 생성")

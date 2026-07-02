import os
from PIL import Image

dest_dir = "/Users/paulgibeault/work/sow-duku/assets"

files = [
    "logo/wordmark.svg",
    "logo/mark-square.svg",
    "piggy/settled.svg",
    "board/hoofprint.svg",
    "board/heart-full.svg",
    "board/heart-empty.svg"
]

# We want to check the PNG files inside the SVGs or open the original source files
src_dir = "/Users/paulgibeault/.gemini/antigravity/brain/439d6062-9f51-4c10-ba91-147a65f6c6dc"
org_files = {
    "hoofprint": "hoofprint_marker_1783003467475.png",
    "hearts": "hearts_pair_1783003478437.png",
    "piggy": "piggy_settled_1783003456228.png"
}

for name, f in org_files.items():
    path = os.path.join(src_dir, f)
    if os.path.exists(path):
        img = Image.open(path)
        # Check colors at corners
        c1 = img.getpixel((0, 0))
        c2 = img.getpixel((img.width - 1, 0))
        c3 = img.getpixel((0, img.height - 1))
        c4 = img.getpixel((img.width - 1, img.height - 1))
        print(f"Original {name} ({img.size}): corners -> {c1}, {c2}, {c3}, {c4}")
    else:
        print(f"NOT FOUND: {path}")

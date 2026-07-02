import os
from PIL import Image

output_dir = "/Users/paulgibeault/.gemini/antigravity/brain/439d6062-9f51-4c10-ba91-147a65f6c6dc"
files = [
    "favicon_source_1783003426695.png",
    "logo_wordmark_1783003436171.png",
    "logo_square_1783003446975.png",
    "piggy_settled_1783003456228.png",
    "hoofprint_marker_1783003467475.png",
    "hearts_pair_1783003478437.png"
]

for f in files:
    path = os.path.join(output_dir, f)
    if os.path.exists(path):
        with Image.open(path) as img:
            print(f"{f}: {img.size} {img.mode}")
    else:
        print(f"NOT FOUND: {f}")

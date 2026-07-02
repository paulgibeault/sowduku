import os
from PIL import Image, ImageDraw

src_dir = "/Users/paulgibeault/.gemini/antigravity/brain/439d6062-9f51-4c10-ba91-147a65f6c6dc"

files = {
    "hoofprint": "hoofprint_marker_1783003467475.png",
    "hearts": "hearts_pair_1783003478437.png",
    "piggy": "piggy_settled_1783003456228.png",
    "wordmark": "logo_wordmark_1783003436171.png",
    "logo_square": "logo_square_1783003446975.png"
}

def test_threshold(name, filename, thresh, seed_points):
    path = os.path.join(src_dir, filename)
    img = Image.open(path).convert("RGBA")
    for pt in seed_points:
        ImageDraw.floodfill(img, pt, (0, 0, 0, 0), thresh=thresh)
    bbox = img.getbbox()
    print(f"{name} with thresh={thresh}: bbox={bbox}")
    return bbox

# Test hoofprint
for t in [20, 30, 40, 50]:
    test_threshold("hoofprint", files["hoofprint"], t, [(0, 0), (0, 1023), (1023, 0), (1023, 1023)])

print("---")
# Test hearts (let's split first)
hearts_path = os.path.join(src_dir, files["hearts"])
if os.path.exists(hearts_path):
    img = Image.open(hearts_path)
    width, height = img.size
    left_half = img.crop((0, 0, width // 2, height)).convert("RGBA")
    right_half = img.crop((width // 2, 0, width, height)).convert("RGBA")
    for t in [20, 30, 40, 50]:
        lh = left_half.copy()
        ImageDraw.floodfill(lh, (0, 0), (0, 0, 0, 0), thresh=t)
        rh = right_half.copy()
        ImageDraw.floodfill(rh, (0, 0), (0, 0, 0, 0), thresh=t)
        print(f"hearts_left with thresh={t}: bbox={lh.getbbox()}")
        print(f"hearts_right with thresh={t}: bbox={rh.getbbox()}")

print("---")
# Test piggy (peach border first, then crop, then white fill)
pig_path = os.path.join(src_dir, files["piggy"])
if os.path.exists(pig_path):
    img = Image.open(pig_path)
    for pb_t in [10, 20]:
        for w_t in [20, 30, 40, 50]:
            rgba = img.convert("RGBA")
            ImageDraw.floodfill(rgba, (0, 0), (0, 0, 0, 0), thresh=pb_t)
            bbox = rgba.getbbox()
            if bbox:
                cropped = rgba.crop(bbox)
                rgba_pig = cropped.copy()
                ImageDraw.floodfill(rgba_pig, (0, 0), (0, 0, 0, 0), thresh=w_t)
                print(f"piggy with pb_t={pb_t}, w_t={w_t}: bbox={rgba_pig.getbbox()}")

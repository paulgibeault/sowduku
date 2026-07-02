import os
from PIL import Image, ImageDraw

src_dir = "/Users/paulgibeault/.gemini/antigravity/brain/439d6062-9f51-4c10-ba91-147a65f6c6dc"
pig_path = os.path.join(src_dir, "piggy_settled_1783003456228.png")

img = Image.open(pig_path)
# Crop to the white box
cropped = img.crop((134, 134, 890, 890)).convert("RGBA")
# Floodfill from (0,0)
ImageDraw.floodfill(cropped, (0, 0), (0, 0, 0, 0), thresh=25)
bbox = cropped.getbbox()
print(f"Cropped piggy bbox: {bbox}")
if bbox:
    final_pig = cropped.crop(bbox)
    print(f"Final pig size: {final_pig.size}")

import os
from PIL import Image

src_dir = "/Users/paulgibeault/.gemini/antigravity/brain/439d6062-9f51-4c10-ba91-147a65f6c6dc"
pig_path = os.path.join(src_dir, "piggy_settled_1783003456228.png")

img = Image.open(pig_path)
width, height = img.size

# Let's find the first row and column that contain a horizontal/vertical line of white pixels,
# or scan from center outwards.
# Since the white box is in the center, let's scan along the diagonal from (0,0) to (512,512).
white_box = None
for i in range(width // 2):
    p = img.getpixel((i, i))
    # Check if color is close to white
    if p[0] > 250 and p[1] > 250 and p[2] > 250:
        # Found the top-left corner of the white box
        top_left = i
        break

# Scan from bottom-right (1023, 1023) to center
for i in range(width - 1, width // 2, -1):
    p = img.getpixel((i, i))
    if p[0] > 250 and p[1] > 250 and p[2] > 250:
        bottom_right = i
        break

print(f"White box bounds: top_left={top_left}, bottom_right={bottom_right}")

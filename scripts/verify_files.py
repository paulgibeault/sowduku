import os

dest_dir = "/Users/paulgibeault/work/sow-duku/assets"

required_files = [
    "favicon/favicon.ico",
    "favicon/favicon-16x16.png",
    "favicon/favicon-32x32.png",
    "favicon/favicon-192x192.png",
    "favicon/favicon-512x512.png",
    "favicon/apple-touch-icon.png",
    "favicon/site.webmanifest",
    "logo/wordmark.svg",
    "logo/mark-square.svg",
    "piggy/settled.svg",
    "board/hoofprint.svg",
    "board/heart-full.svg",
    "board/heart-empty.svg",
    "illustration/win-vignette.svg",
    "illustration/fail-vignette.svg",
    "illustration/empty-history.svg",
    "illustration/empty-curated.svg",
    "illustration/empty-firstrun.svg",
    "illustration/misty-badge.svg"
]

all_ok = True
for f in required_files:
    path = os.path.join(dest_dir, f)
    if os.path.exists(path):
        sz = os.path.getsize(path)
        if sz > 0:
            print(f"OK: {f} ({sz} bytes)")
        else:
            print(f"ERROR: {f} is empty!")
            all_ok = False
    else:
        print(f"ERROR: {f} does not exist at {path}!")
        all_ok = False

if all_ok:
    print("ALL FILES VERIFIED SUCCESSFULLY!")
else:
    print("SOME FILES ARE MISSING OR EMPTY!")

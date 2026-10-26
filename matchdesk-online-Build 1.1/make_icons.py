"""Builds the app icons (web/icons/icon-192.png, icon-512.png) from your logo. Skips quietly if there is no logo."""
import os, sys
try:
    from PIL import Image
except Exception:
    sys.exit(0)
here = os.path.dirname(os.path.abspath(__file__)); web = os.path.join(here, "web")
names = ["tristar_logo.png", "Tristar_logo.png", "TriStar_logo.png", "tristar_logo.PNG", "tristar_logo.jpg", "tristar_logo.jpeg", "logo.png", "logo.PNG", "logo.jpg"]
logo = next((os.path.join(d, n) for d in (os.path.join(web, "images"), web) for n in names if os.path.exists(os.path.join(d, n))), None)
if not logo:
    sys.exit(0)
src = Image.open(logo).convert("RGBA")
os.makedirs(os.path.join(web, "icons"), exist_ok=True)
for size in (192, 512):
    canvas = Image.new("RGBA", (size, size), (74, 111, 165, 255))          # app blue background
    box = int(size * 0.72)                                                  # keep inside the "safe zone" for round icons
    img = src.copy(); img.thumbnail((box, box), Image.LANCZOS)
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    canvas.convert("RGB").save(os.path.join(web, "icons", f"icon-{size}.png"))
print("App icons updated from", os.path.basename(logo))

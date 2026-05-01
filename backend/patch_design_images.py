"""
Patch script: updates the media.file paths in MongoDB Design documents
to point to the real image files in couturehouse/designs/
"""
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from actors.couturehouse.models.models import Design, DesignMedia

FASHION_HOUSE_ID = 32  # fedylajnef1@gmail.com

# Map design title -> actual image filename (1.png = black tuxedo, etc.)
TITLE_TO_IMAGE = {
    "Le Smoking Classique":          "couturehouse/designs/5.png",   # black tuxedo
    "Costume Anthracite Business":   "couturehouse/designs/1.png",   # charcoal grey
    "Marine Royal":                  "couturehouse/designs/2.png",   # navy double-breasted
    "Costume Tweed Noisette Country":"couturehouse/designs/3.png",   # brown tweed
    "Costume Bleu Royal Slim Fit":   "couturehouse/designs/4.png",   # royal blue slim
}

designs = Design.objects.filter(fashion_house_id=FASHION_HOUSE_ID)
print(f"Found {designs.count()} designs for fashion_house_id={FASHION_HOUSE_ID}\n")

for design in designs:
    # Try exact match first, then partial match
    image_path = TITLE_TO_IMAGE.get(design.title)
    if not image_path:
        # Try partial match (handles accented chars difference e.g. "Croise" vs "Croise Marine")
        for key, val in TITLE_TO_IMAGE.items():
            if key.lower() in design.title.lower() or design.title.lower() in key.lower():
                image_path = val
                break

    if not image_path:
        print(f"  [SKIP] No mapping found for: '{design.title}'")
        continue

    # Replace or set the media list
    design.media = [DesignMedia(
        file=image_path,
        media_type="photo",
        view_angle="front",
        is_cover=True,
        order=0,
    )]
    design.save()
    print(f"  [OK] '{design.title}' -> {image_path}")

print("\nPatch complete!")

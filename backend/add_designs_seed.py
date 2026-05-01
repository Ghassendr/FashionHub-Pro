"""
Script to seed 5 suit designs for fedylajnef1@gmail.com (ID: 32, Maison de Couture)
Run: python add_designs_seed.py
"""
import os
import sys
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.couturehouse.models.models import Design, DesignMedia

FASHION_HOUSE_ID = 32  # fedylajnef1@gmail.com

designs_data = [
    {
        "title": "Le Smoking Classique",
        "description": (
            "Un smoking noir intemporel, symbole du raffinement masculin absolu. "
            "Coupe slim avec revers en pointe (peak lapels) en satin noir, bouton unique, "
            "poches passepoilées en satin. Accompagné d'un pantalon assorti avec bande de satin sur les côtés. "
            "Idéal pour les soirées de gala, mariages et événements black-tie. "
            "Tissus recommandés : Laine super 120s ou Mohair pour un tombé parfait."
        ),
        "category": "suit",
        "fabric_suggestions": "Laine super 120s, Mohair noir, Laine mélangée haute couture",
        "status": "published",
        "morphologies": ["H", "V", "X"],
        "media_file": "designs/smoking_classique.jpg",
        "media_type": "photo",
        "view_angle": "front",
    },
    {
        "title": "Costume Anthracite Business",
        "description": (
            "Costume deux pièces en gris anthracite chiné, l'allié parfait du professionnel moderne. "
            "Veste droite à deux boutons, revers en pointe classique, deux poches à rabat et une poche poitrine. "
            "Pantalon à pince avec tombé élégant. "
            "Ce coloris neutre se porte aussi bien avec une cravate en soie qu'en version décontractée. "
            "Convient parfaitement aux réunions d'affaires, présentations corporate et cocktails."
        ),
        "category": "suit",
        "fabric_suggestions": "Laine flannelle anthracite, Laine worsted, Sergé de laine italiano",
        "status": "published",
        "morphologies": ["H", "A", "V", "X"],
        "media_file": "designs/costume_anthracite.jpg",
        "media_type": "photo",
        "view_angle": "front",
    },
    {
        "title": "Costume Croisé Marine Royal",
        "description": (
            "Un costume croisé bleu marine d'une élégance souveraine. Six boutons, revers en pointe larges, "
            "silhouette structurée aux épaules. La coupe met en valeur la carrure masculine avec autorité. "
            "Accompagné d'une pochette blanche en lin pour l'accent parfait. "
            "Ce modèle signature est idéal pour les cérémonies officielles, mariages chics et dîners de prestige. "
            "Le croisé confère une allure puissante et distinctive."
        ),
        "category": "suit",
        "fabric_suggestions": "Serge de laine bleu marine, Laine gabardine, Worsted 100% laine vierge",
        "status": "published",
        "morphologies": ["H", "V", "X"],
        "media_file": "designs/costume_croise_marine.jpg",
        "media_type": "photo",
        "view_angle": "front",
    },
    {
        "title": "Costume Tweed Noisette Country",
        "description": (
            "Un costume en tweed à chevrons brun noisette, hommage au style britannique countryside revisité. "
            "Veste décontractée à deux boutons, larges poches plaquées, ourlets du pantalon retournés (turn-ups). "
            "La texture du tweed lui confère un caractère unique et chaleureux, parfait pour les automnes élégants. "
            "Ce modèle se porte avec une chemise en chambray ou en Oxford pour un look casual-chic authentique. "
            "Convient aux week-ends campagnards, vernissages et déjeuners en plein air."
        ),
        "category": "suit",
        "fabric_suggestions": "Tweed à chevrons Harris Tweed, Tweed de laine irlandaise, Laine bouclée noisette",
        "status": "published",
        "morphologies": ["H", "A", "V", "8"],
        "media_file": "designs/costume_tweed_noisette.jpg",
        "media_type": "photo",
        "view_angle": "front",
    },
    {
        "title": "Costume Bleu Royal Slim Fit",
        "description": (
            "Un costume bleu roi éclatant à la coupe slim ultra-moderne. "
            "Veste cintrée à deux boutons, revers en pointe, finitions soignées. "
            "Ce coloris vif et affirmé se porte décontracté avec un t-shirt blanc pour un style à la pointe de la mode. "
            "Pantalon slim à jambe droite pour une silhouette effilée et dynamique. "
            "Parfait pour les événements festifs, cocktails mondains et sorties urbaines. "
            "Le bleu royal valorise particulièrement les carnations méditerranéennes et dorées."
        ),
        "category": "suit",
        "fabric_suggestions": "Laine stretch bleu royal, Laine mélangée polyester haute qualité, Tissu ottoman bleu",
        "status": "published",
        "morphologies": ["H", "V", "X"],
        "media_file": "designs/costume_bleu_royal.jpg",
        "media_type": "photo",
        "view_angle": "front",
    },
]

print(f"Inserting designs for fashion_house_id={FASHION_HOUSE_ID}...")
now = datetime.utcnow()

existing_titles = [d.title for d in Design.objects.filter(fashion_house_id=FASHION_HOUSE_ID)]
print(f"Existing designs: {existing_titles}")

for d in designs_data:
    if d["title"] in existing_titles:
        print(f"  [SKIP] Already exists: '{d['title']}'")
        continue
    design = Design(
        fashion_house_id=FASHION_HOUSE_ID,
        title=d["title"],
        description=d["description"],
        category=d["category"],
        fabric_suggestions=d["fabric_suggestions"],
        status=d["status"],
        morphologies=d["morphologies"],
        created_at=now,
        updated_at=now,
        published_at=now,
    )

    media = DesignMedia(
        file=d["media_file"],
        media_type=d["media_type"],
        view_angle=d["view_angle"],
        is_cover=True,
        order=0,
    )
    design.media = [media]
    design.save()
    print(f"  [OK] Created: '{d['title']}' (ID: {design.id})")

print("\nAll 5 designs inserted successfully!")

# Verify
from actors.couturehouse.models.models import Design as D
count = D.objects.filter(fashion_house_id=FASHION_HOUSE_ID).count()
print(f"Total designs for account ID {FASHION_HOUSE_ID}: {count}")

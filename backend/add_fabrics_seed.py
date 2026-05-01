"""
Script to seed 5 fabrics for fedylajnef2@gmail.com (ID: 33, Supplier)
Run: python add_fabrics_seed.py
"""
import os
import sys
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.fournisseur.models import Fabric
from core.models.user import User

USER_ID = 33  # fedylajnef2@gmail.com

fabrics_data = [
    {
        "materiel": "Laine Anthracite Worsted",
        "description": "Laine de haute qualité, idéale pour les costumes business. Texture fine et résistante.",
        "quantite": 100.00,
        "prix": 45.00,
        "color": [54, 54, 54],
        "image": "fabrics/11.png"
    },
    {
        "materiel": "Serge de Laine Bleu Marine",
        "description": "Tissu classique pour costumes croisés ou droits. Profondeur de couleur exceptionnelle.",
        "quantite": 80.00,
        "prix": 50.00,
        "color": [0, 0, 128],
        "image": "fabrics/12.png"
    },
    {
        "materiel": "Lin Mélangé Bleu Royal",
        "description": "Mélange lin et coton pour un confort optimal en été. Couleur vive et moderne.",
        "quantite": 60.00,
        "prix": 35.00,
        "color": [65, 105, 225],
        "image": "fabrics/13.png"
    },
    {
        "materiel": "Laine et Soie Noire",
        "description": "Finition satinée luxueuse pour smokings et tenues de soirée.",
        "quantite": 50.00,
        "prix": 75.00,
        "color": [0, 0, 0],
        "image": "fabrics/14.png"
    },
    {
        "materiel": "Tweed à Chevrons Noisette",
        "description": "Tweed rustique et élégant, parfait pour les vestes d'automne et le style British.",
        "quantite": 40.00,
        "prix": 60.00,
        "color": [139, 90, 43],
        "image": "fabrics/15.png"
    },
]

try:
    user = User.objects.get(id=USER_ID)
    print(f"Inserting {len(fabrics_data)} fabrics for user: {user.email} (ID: {USER_ID})...")
except User.DoesNotExist:
    print(f"Error: User with ID {USER_ID} not found.")
    sys.exit(1)

existing_fabrics = [f.materiel for f in Fabric.objects.filter(user=user)]

for fd in fabrics_data:
    if fd["materiel"] in existing_fabrics:
        print(f"  [SKIP] Fabric '{fd['materiel']}' already exists.")
        continue
    
    fabric = Fabric.objects.create(
        user=user,
        materiel=fd["materiel"],
        description=fd["description"],
        quantite=fd["quantite"],
        prix=fd["prix"],
        color=fd["color"],
        image=fd["image"]
    )
    print(f"  [OK] Created: '{fd['materiel']}' (ID: {fabric.id})")

print("\nAll fabrics processed successfully!")

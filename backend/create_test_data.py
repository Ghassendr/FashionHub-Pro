import os
import django
from django.utils import timezone
from datetime import datetime

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models.user import User
from actors.fournisseur.models import SupplierProfile, Fabric
from actors.couturehouse.models.models import CoutureHouseProfile, Design

# Delete old test users if they exist
emails_to_delete = [
    'fournisseur1@test.com', 'fournisseur2@test.com', 'fournisseur3@test.com',
    'couture1@test.com', 'couture2@test.com', 'couture3@test.com'
]
User.objects.filter(email__in=emails_to_delete).delete()

# Create Fournisseurs
fournisseurs = []
fabrics_data = [
    {"materiel": "Soie Blanche", "prix": 25.50, "color": [255, 255, 255], "category": "Soie"},
    {"materiel": "Coton Bio", "prix": 15.00, "color": [245, 245, 220], "category": "Coton"},
    {"materiel": "Lin Naturel", "prix": 20.00, "color": [210, 180, 140], "category": "Lin"},
]

for i in range(1, 4):
    user = User.objects.create_user(
        email=f'fournisseur{i}@test.com',
        username=f'fournisseur{i}',
        password='password123',
        role='fournisseur',
        account_status='approved'
    )
    fournisseurs.append(user)
    
    profile = SupplierProfile.objects.create(
        user=user,
        nom=f"Nom{i}",
        prenom=f"Prenom{i}",
        nomOrganization=f"Fournisseur Org {i}",
        verification_status='approved',
        fabric_category=fabrics_data[i-1]["category"]
    )
    
    Fabric.objects.create(
        user=user,
        materiel=fabrics_data[i-1]["materiel"],
        prix=fabrics_data[i-1]["prix"],
        quantite=100.0,
        color=fabrics_data[i-1]["color"],
        description=f"Magnifique {fabrics_data[i-1]['materiel']}"
    )

print("Created 3 Fournisseurs with Fabrics.")

# Create Couture Houses
couture_houses = []
designs_data = [
    {"title": "Robe de Soirée Étoilée", "category": "dress"},
    {"title": "Costume Sur Mesure", "category": "suit"},
    {"title": "Veste en Cuir Minimaliste", "category": "jacket"},
]

for i in range(1, 4):
    user = User.objects.create_user(
        email=f'couture{i}@test.com',
        username=f'couture{i}',
        password='password123',
        role='couture_house',
        account_status='approved'
    )
    couture_houses.append(user)
    
    profile = CoutureHouseProfile.objects.create(
        user=user,
        house_name=f"Maison Couture {i}",
        specialization=designs_data[i-1]["category"],
        verification_status='approved'
    )
    
    # Mongoengine Design
    design = Design(
        fashion_house_id=user.id,
        title=designs_data[i-1]["title"],
        category=designs_data[i-1]["category"],
        status="published",
        description=f"Description for {designs_data[i-1]['title']}",
        created_at=datetime.utcnow()
    )
    design.save()

print("Created 3 Couture Houses with Designs.")

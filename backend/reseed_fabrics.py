import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
try:
    django.setup()
except Exception:
    import sys
    sys.path.append(os.getcwd())
    django.setup()

from django.contrib.auth import get_user_model
from actors.fournisseur.models import Fabric, SupplierProfile

User = get_user_model()

def reseed():
    print("--- Starting Fabric Reseed ---")
    
    # 1. Create or get Test Supplier
    supplier_email = 'fournisseur@gmail.com'
    supplier_user, created = User.objects.get_or_create(
        username=supplier_email,
        email=supplier_email,
        defaults={'role': 'fournisseur', 'account_status': 'verified'}
    )
    if created:
        supplier_user.set_password('password123')
        supplier_user.save()
        print(f"Created Supplier User: {supplier_email}")
    else:
        print(f"Existing Supplier User: {supplier_email}")

    # 2. Basic Profile
    profile, p_created = SupplierProfile.objects.get_or_create(
        user=supplier_user,
        defaults={
            'nomOrganization': 'Maison Noir Textiles',
            'nomContact': 'Julian',
            'prenomContact': 'Ross',
            'telephoneContact': '+33 1 23 45 67 89',
            'ville': 'Paris',
            'pays': 'France',
            'commercial_register_url': 'base64_placeholder',
            'id_card_url': 'base64_placeholder',
            'fabric_quality_cert_url': 'base64_placeholder',
            'fabric_sample_photos_url': 'base64_placeholder',
            'warehouse_photo_url': 'base64_placeholder'
        }
    )
    print(f"Supplier Profile ready.")

    # 3. Create Fabrics
    fabric_templates = [
        ("Silk Satin Premium", "Luxury mulberry silk with a lustrous finish, perfect for evening gowns.", 120.00, [[240, 230, 220]]),
        ("Midnight Velvet", "Deep obsidian velvet with a soft pile and exceptional drape.", 85.50, [[10, 10, 15]]),
        ("Golden Brocade", "Elaborate floral patterns woven with metallic gold threads.", 150.00, [[212, 175, 55]]),
        ("Cashmere Wool", "Ultra-soft charcoal cashmere wool blend for structured coats.", 95.00, [[60, 60, 65]]),
        ("Ivory Lace", "Delicate Chantilly lace with intricate floral motifs.", 110.00, [[255, 255, 240]]),
        ("Crimson Chiffon", "Lightweight and sheer silk chiffon in a vibrant ruby red.", 45.00, [[220, 20, 60]]),
        ("Raw Denim Noir", "Unwashed indigo denim, 14oz weight for modern silhouettes.", 35.00, [[25, 25, 45]]),
        ("Emerald Tulle", "Etherial layered tulle in a deep forest green.", 25.00, [[0, 71, 49]]),
        ("Champagne Linen", "Breathable organic linen with a natural textured weave.", 55.00, [[241, 231, 192]]),
        ("Silver Lamé", "High-shine silver metallic fabric for statement pieces.", 70.00, [[192, 192, 192]]),
    ]

    # Clear existing if any
    Fabric.objects.filter(user=supplier_user).delete()

    for materiel, desc, price, color in fabric_templates:
        f = Fabric.objects.create(
            user=supplier_user,
            materiel=materiel,
            description=desc,
            prix=price,
            quantite=random.randint(50, 500),
            color=color,
            likes=random.randint(5, 50)
        )
        print(f"Added Fabric: {materiel}")

    print(f"--- Reseed Complete: {Fabric.objects.count()} fabrics total ---")

if __name__ == "__main__":
    reseed()

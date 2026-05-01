import os
import django
from datetime import datetime
from mongoengine import connect

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# Import SQL Models
from core.models.user import User
from actors.couturehouse.models.models import CoutureHouseProfile, DesignLike, AtelierReview, Order, LocalFabricStock
from actors.fournisseur.models import SupplierProfile, Fabric, FabricOrder, FabricLike
from actors.delivery.models.models import Carrier, Vehicle, Route, ShipmentRequest
from actors.client.models.models import ClientProject as ClientProjectMongo # Check if this is the right import

# Import Mongo Models
from actors.couturehouse.models.models import Design

def setup_demo():
    print("--- Starting Demo Setup ---")

    # 1. Cleanup
    print("Cleaning database...")
    User.objects.all().delete()
    Design.objects.all().delete()
    # ClientProject is a Mongo document, let's make sure we have the right one
    try:
        from actors.client.models.models import ClientProject
        ClientProject.objects.all().delete()
    except Exception as e:
        print(f"Note: Could not clear ClientProjects: {e}")

    # 2. Create Users
    print("Creating users...")
    
    # 1. Couture House (Maison El Anis Couture)
    anis = User.objects.create_user(
        email="contact@elanis-couture.tn",
        password="couture123",
        username="elanis_couture",
        role="couture_house",
        account_status="approved",
        first_name="El Anis",
        last_name="Couture"
    )
    anis_profile = CoutureHouseProfile.objects.create(
        user=anis,
        house_name="Maison El Anis Couture",
        specialization="Haute couture / prêt-à-porter",
        starting_price=1200.00,
        avg_production_time="3-5 weeks",
        address="Maison El Anis, 15 Avenue de la Liberté, Tunis 1002, Tunisie",
        verification_status="approved",
        about_text="Maison El Anis Couture est une maison de haute couture prestigieuse située au cœur de Tunis, alliant tradition et modernité pour des créations d'exception.",
        introduction_video="https://youtu.be/FMXuyJvQq28"
    )

    # 2. Supplier (Textile Plus Tunisia)
    supplier_user = User.objects.create_user(
        email="sales@textileplus.tn",
        password="fourn123",
        username="textile_plus",
        role="fournisseur",
        account_status="approved",
        first_name="Textile",
        last_name="Plus"
    )
    supplier_profile = SupplierProfile.objects.create(
        user=supplier_user,
        nomOrganization="Textile Plus Tunisia",
        lieu="Sfax",
        adresse="Textile Plus, Route de Gabès Km 3, Sfax 3000, Tunisie",
        typeProduct="Premium Fabrics",
        specialites="Tissu coton, Soie, Denim",
        verification_status="approved",
        description="Textile Plus Tunisia est le leader de la fourniture de tissus premium en Tunisie, desservant les plus grandes maisons de couture avec du coton, de la soie et du denim de haute qualité.",
        introduction_video="atelier_videos/360_Pose_Reference__DaveC001.mp4"
    )

    # 3. Delivery (Omar Jlassi)
    delivery_user = User.objects.create_user(
        email="omar.jlassi@gmail.com",
        password="delivery123",
        username="omar_jlassi",
        role="delivery",
        account_status="approved",
        first_name="Omar",
        last_name="Jlassi"
    )
    carrier_profile = Carrier.objects.create(
        user=delivery_user,
        company_name="Omar Jlassi Delivery",
        contact_phone="+216 92 445 778",
        address="Omar Jlassi Logistique, Boulevard du 14 Janvier, Sfax 3027, Tunisie",
        verification_status="approved",
        service_type="Scooter Delivery - Sfax Centre",
        delivery_time_guarantee="Fast Local Delivery",
        insurance_coverage="Standard Protection",
        introduction_video="atelier_videos/360_Pose_Reference__DaveC001.mp4"
    )

    # 4. Client (Aymen Ben Salah)
    client_user = User.objects.create_user(
        email="aymen.bensalah@gmail.com",
        password="client123",
        username="aymen_bensalah",
        role="client",
        account_status="active",
        first_name="Aymen",
        last_name="Ben Salah"
    )
    from actors.client.models.models import ClientProfile
    ClientProfile.objects.create(
        user=client_user,
        phone="+216 22 114 556",
        address="Résidence du Lac, Les Berges du Lac 1, Tunis 1053, Tunisie"
    )

    # 5. Super Admin
    admin_user = User.objects.create_superuser(
        email="admin@fashionhub.pro",
        password="admin123",
        username="superadmin",
        role="admin"
    )

    # 3. Seed Designs for Maison El Anis
    print("Seeding designs...")
    designs_data = [
        {"title": "Midnight Gala Gown", "category": "suit", "desc": "A stunning floor-length gown in deep midnight blue silk velvet.", "components": ["Robe de Gala", "Étole en Soie"], "img": "couturehouse/designs/1.png"},
        {"title": "Ivory Bridal Masterpiece", "category": "suit", "desc": "Intricate lace and silk organza bridal gown with a hand-embroidered train.", "components": ["Robe de Mariée", "Voile en Dentelle", "Jupon"], "img": "couturehouse/designs/2.png"},
        {"title": "Modern Executive Suit", "category": "suit", "desc": "Sharp, tailored two-piece suit in premium Italian wool.", "components": ["Veste cintrée", "Pantalon à pinces"], "img": "couturehouse/designs/3.png"},
        {"title": "Sunset Cocktail Dress", "category": "suit", "desc": "Vibrant silk chiffon dress with delicate pleating.", "components": ["Robe Cocktail", "Ceinture assortie"], "img": "couturehouse/designs/4.png"},
        {"title": "Noir Evening Blazer", "category": "suit", "desc": "Structured blazer with satin lapels and crystal embellishments.", "components": ["Blazer de Soirée", "Pantalon Slim Satin"], "img": "couturehouse/designs/5.png"},
    ]

    for d in designs_data:
        design = Design(
            fashion_house_id=anis.id,
            title=d["title"],
            description=d["desc"],
            category=d["category"],
            suit_components=d["components"],
            status="published",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            published_at=datetime.now()
        )
        # Add media
        from actors.couturehouse.models.models import DesignMedia
        design.media.append(DesignMedia(file=d["img"], media_type="photo", view_angle="front", is_cover=True))
        design.save()

    # 4. Seed Fabrics for Textile Plus
    print("Seeding fabrics...")
    fabrics_data = [
        {"materiel": "Italian Silk Satin", "desc": "Ultra-smooth 100% silk satin with a high-gloss finish.", "img": "fabrics/11.png", "price": 45.00, "color_name": "Royal Blue", "rgb": [0, 35, 102]},
        {"materiel": "Premium Merino Wool", "desc": "Fine-gauge merino wool, perfect for bespoke tailoring.", "img": "fabrics/12.png", "price": 38.50, "color_name": "Charcoal Grey", "rgb": [54, 69, 79]},
        {"materiel": "Embroidered Tulle", "desc": "Delicate French tulle with floral hand-embroidery.", "img": "fabrics/13.png", "price": 65.00, "color_name": "Champagne", "rgb": [247, 231, 206]},
        {"materiel": "Organic Linen", "desc": "Heavyweight organic linen with a natural texture.", "img": "fabrics/14.png", "price": 22.00, "color_name": "Sage Green", "rgb": [188, 184, 138]},
        {"materiel": "Gold Lurex Brocade", "desc": "Luxurious brocade with metallic gold threads.", "img": "fabrics/15.png", "price": 55.00, "color_name": "Metallic Gold", "rgb": [212, 175, 55]},
    ]

    for f in fabrics_data:
        Fabric.objects.create(
            user=supplier_user,
            materiel=f["materiel"],
            description=f["desc"],
            image=f["img"],
            prix=f["price"],
            color_name=f["color_name"],
            color=f["rgb"],
            quantite=100.00
        )

    print("--- Demo Setup Complete ---")
    print(f"Login with: contact@elanis-couture.tn / couture123")

if __name__ == "__main__":
    setup_demo()

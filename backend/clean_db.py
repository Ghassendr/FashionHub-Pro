import os
import django
from mongoengine import connect

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models.user import User
from actors.fournisseur.models import FabricOrder
from actors.couturehouse.models.models import Order, AtelierReview, DesignLike, LocalFabricStock, CoutureHouseProfile
from actors.delivery.models.models import ShipmentRequest
from actors.client.models.models import ClientProject

def clean_db():
    print("--- Starting Database Cleanup ---")
    
    # 1. SQL Cleanup
    print("Cleaning SQL tables...")
    try:
        Order.objects.all().delete()
        AtelierReview.objects.all().delete()
        DesignLike.objects.all().delete()
        LocalFabricStock.objects.all().delete()
        FabricOrder.objects.all().delete()
        ShipmentRequest.objects.all().delete()
        print("SQL Cleanup: Orders, Reviews, Likes, Stock, FabricOrders, Shipments deleted.")
    except Exception as e:
        print(f"Error during SQL Cleanup: {e}")
    
    # Note: Fabric is NOT deleted as requested
    print("Preserved: User, Profiles, Fabrics.")

    # 2. MongoDB Cleanup
    print("Cleaning MongoDB collections...")
    try:
        ClientProject.objects.all().delete()
        print("MongoDB Cleanup: ClientProjects deleted.")
    except Exception as e:
        print(f"Error during MongoDB Cleanup: {e}")
    
    # Note: Design is NOT deleted as requested
    print("Preserved: Designs.")

    # 3. Setup Pro Account
    pro_email = "fedylajn@gmail.com"
    try:
        user = User.objects.get(email=pro_email)
        user.account_status = 'approved'
        user.save()
        
        profile, created = CoutureHouseProfile.objects.get_or_create(user=user)
        profile.verification_status = 'approved'
        if not profile.house_name:
            profile.house_name = "Maison de Couture Pro"
        profile.save()
        
        print(f"User {pro_email} is now a Pro Account (Approved).")
    except User.DoesNotExist:
        print(f"Warning: User {pro_email} not found.")

    print("--- Cleanup Complete ---")

if __name__ == "__main__":
    clean_db()

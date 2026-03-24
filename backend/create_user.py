import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from actors.fournisseur.models import SupplierProfile

def create_test_user():
    email = "admin@fashionhub.pro"
    password = "password123"
    
    if not User.objects.filter(email=email).exists():
        user = User.objects.create_superuser(
            username=email, 
            email=email, 
            password=password
        )
        # Create a basic profile for him
        SupplierProfile.objects.create(
            user=user,
            nom="Admin",
            prenom="System",
            nomOrganization="Maison Tissue",
            lieu="Paris"
        )
        print(f"✅ User created: {email} / {password}")
    else:
        print(f"ℹ️ User {email} already exists.")

if __name__ == "__main__":
    create_test_user()

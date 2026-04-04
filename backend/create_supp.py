import os
import django
import sys

# Add the backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.auth.models import User
from actors.fournisseur.models import SupplierProfile

def create_supplier():
    email = 'vendeur@gmail.com'
    password = '123123'

    user, created = User.objects.get_or_create(email=email)
    if created:
        user.set_password(password)
        user.role = 'fournisseur'
        user.save()
        print(f"User {email} created.")
    else:
        user.role = 'fournisseur'
        user.save()
        print(f"User {email} already exists and updated to role fournisseur.")

    profile, p_created = SupplierProfile.objects.get_or_create(
        user=user,
        defaults={
            'nomOrganization': 'Textiles de Luxe',
            'verification_status': 'approved'
        }
    )

    if p_created:
        print(f"Supplier profile created for {email}.")
    else:
        profile.verification_status = 'approved'
        profile.save()
        print(f"Supplier profile updated/verified for {email}.")

if __name__ == '__main__':
    create_supplier()

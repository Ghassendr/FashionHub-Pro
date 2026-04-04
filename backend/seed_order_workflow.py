import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from actors.delivery.models import Carrier, Route
from actors.fournisseur.models import SupplierProfile, Fabric

User = get_user_model()

def seed():
    # 1. Ensure a Carrier exists
    carrier_user, _ = User.objects.get_or_create(username='carrier_logistics', defaults={'email': 'logistics@express.com'})
    carrier_user.set_password('admin123')
    carrier_user.role = 'delivery'
    carrier_user.save()
    
    carrier, _ = Carrier.objects.get_or_create(
        user=carrier_user,
        defaults={'company_name': 'Express Couture Logistics', 'contact_phone': '+33 6 12 34 56 78'}
    )
    
    # 2. Add Route: Nice -> Sousse
    Route.objects.get_or_create(
        carrier=carrier,
        start_location='Nice',
        end_location='Sousse',
        defaults={'estimated_duration_mins': 1920, 'status': 'PENDING'}
    )
    
    # 3. Ensure a Supplier with Silk exists
    supplier_user, _ = User.objects.get_or_create(username='silk_supplier', defaults={'email': 'contact@silkhouse.com'})
    supplier_user.set_password('admin123')
    supplier_user.role = 'fournisseur'
    supplier_user.save()
    
    supplier_profile, _ = SupplierProfile.objects.get_or_create(
        user=supplier_user,
        defaults={'nomOrganization': 'Maison des Tisseurs', 'lieu': 'Nice'}
    )
    
    Fabric.objects.get_or_create(
        user=supplier_user,
        materiel='Soie Naturelle',
        defaults={'quantite': 500, 'prix': 45.0, 'description': 'Magnifique soie de Lyon.'}
    )

    print("✅ Seed successful: Carrier (Nice->Sousse) and Supplier (Silk) ready.")

if __name__ == '__main__':
    seed()

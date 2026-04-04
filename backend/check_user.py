import os
import django
import sys

# Add the backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models.user import User
from actors.fournisseur.models import SupplierProfile

email = 'vendeur@gmail.com'
try:
    user = User.objects.get(email=email)
    print(f"USER_FOUND: {user.email}")
    print(f"ROLE: {user.role}")
    
    try:
        profile = getattr(user, 'supplier_profile', None)
        if profile:
            print(f"PROFILE_FOUND: {profile.nomOrganization}")
            print(f"STATUS: {profile.verification_status}")
        else:
            print("PROFILE_NOT_FOUND")
    except Exception as e:
        print(f"PROFILE_ERROR: {str(e)}")
except User.DoesNotExist:
    print(f"USER_NOT_FOUND: {email}")
except Exception as e:
    print(f"ERROR: {str(e)}")

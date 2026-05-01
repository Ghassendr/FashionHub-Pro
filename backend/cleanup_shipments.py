import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\xampp\\htdocs\\ProjetCTR\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.delivery.models.models import ShipmentRequest

def cleanup_shipments():
    # Find all shipments from Nice to Sousse
    shipments = ShipmentRequest.objects.filter(source_name__icontains='Nice', dest_name__icontains='Sousse')
    count = shipments.count()
    print(f"Found {count} shipments from Nice to Sousse.")
    
    if count > 0:
        shipments.delete()
        print("Deleted redundant Nice-Sousse shipments.")

if __name__ == "__main__":
    cleanup_shipments()

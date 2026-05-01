import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\xampp\\htdocs\\ProjetCTR\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.delivery.models.models import Route

def cleanup_routes():
    # Find all routes from Nice to Sousse
    routes = Route.objects.filter(start_location__icontains='Nice', end_location__icontains='Sousse')
    count = routes.count()
    print(f"Found {count} routes from Nice to Sousse.")
    
    if count > 0:
        routes.delete()
        print("Deleted redundant Nice-Sousse routes.")

if __name__ == "__main__":
    cleanup_routes()

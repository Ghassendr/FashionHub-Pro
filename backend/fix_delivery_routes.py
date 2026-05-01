import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.delivery.models.models import Route, Carrier

def fix_routes():
    # Fix any Nice -> Sousse routes
    routes = Route.objects.filter(start_location__icontains='Nice', end_location__icontains='Sousse')
    if not routes.exists():
        # Also try misspelled ones
        routes = Route.objects.filter(end_location__icontains='souse')
    
    for r in routes:
        print(f"Updating route {r.id}: {r.start_location} -> {r.end_location}")
        r.end_location = 'Sousse'
        r.start_location = 'Nice'
        r.status = 'IN_PROGRESS'
        r.services = [
            {'type': 'standard', 'cost': 30, 'nature': ['Standard'], 'eta': '5-7 days'},
            {'type': 'fast', 'cost': 45, 'nature': ['Standard'], 'eta': '2-3 days'},
            {'type': 'express', 'cost': 75, 'nature': ['Standard', 'Guaranteed'], 'eta': '24-48h'},
            {'type': 'urgent', 'cost': 120, 'nature': ['Standard', 'Guaranteed', 'Fragile'], 'eta': '12-24h'}
        ]
        r.save()

    # Ensure at least one valid route exists if none found
    if not Route.objects.filter(start_location__icontains='Nice', end_location__icontains='Sousse').exists():
        print("Creating new Nice -> Sousse route")
        carrier = Carrier.objects.first()
        if carrier:
            Route.objects.create(
                carrier=carrier,
                start_location='Nice',
                end_location='Sousse',
                status='IN_PROGRESS',
                services=[
                    {'type': 'standard', 'cost': 30, 'nature': ['Standard'], 'eta': '5-7 days'},
                    {'type': 'fast', 'cost': 45, 'nature': ['Standard'], 'eta': '2-3 days'},
                    {'type': 'express', 'cost': 75, 'nature': ['Standard', 'Guaranteed'], 'eta': '24-48h'},
                    {'type': 'urgent', 'cost': 120, 'nature': ['Standard', 'Guaranteed', 'Fragile'], 'eta': '12-24h'}
                ]
            )
        else:
            print("Error: No carrier found to assign route to!")

if __name__ == '__main__':
    fix_routes()

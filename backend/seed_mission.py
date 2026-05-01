import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.delivery.models.models import Carrier, Route, ShipmentRequest
from actors.fournisseur.models import FabricOrder, Fabric

def seed_mission():
    print("Checking carriers...")
    carriers = Carrier.objects.all()
    for c in carriers:
        print(f"ID: {c.id} | Company: {c.company_name} | Email: {c.user.email}")
    
    carrier = Carrier.objects.first()
    if not carrier:
        print("No carrier found!")
        return

    route = Route.objects.filter(start_location__icontains='Nice', end_location__icontains='Sousse').first()
    
    # Try to find the REAL order for Embroidered Tulle
    real_order = FabricOrder.objects.filter(fabric__materiel__icontains='Embroidered').first()
    if real_order:
        print(f"Found real order: {real_order.id} for {real_order.fabric.materiel}")
        order = real_order
        # Force status to ready_for_pickup so it matches the bubble
        order.status = 'ready_for_pickup'
        order.save()
    else:
        print("No real order found for 'Embroidered Tulle', using demo ID 999")
        fabric = Fabric.objects.filter(materiel__icontains='Embroidered').first() or Fabric.objects.first()
        order, _ = FabricOrder.objects.get_or_create(
            id=999,
            defaults={
                'supplier': getattr(fabric.user, 'supplier_profile', None),
                'couture_house_id': 1,
                'couture_house_name': "Maison El Anis Couture",
                'fabric': fabric,
                'quantity': 10.5,
                'delivery_type': 'express'
            }
        )

    for carrier in carriers:
        ShipmentRequest.objects.update_or_create(
            fabric_order_id=order.id,
            carrier=carrier,
            defaults={
                'route': route,
                'source_name': "Textile Plus (Sfax)",
                'dest_name': "Maison El Anis (Tunis)",
                'status': 'pending'
            }
        )
        print(f"Mission created for carrier: {carrier.company_name}")

if __name__ == '__main__':
    seed_mission()

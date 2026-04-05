import os
import django
from django.urls import resolve, reverse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

paths_to_test = [
    '/api/fournisseur/orders/create/',
    '/api/fournisseur/orders/create',
    '/api/couturehouse/orders/fabric-purchases/',
]

for path in paths_to_test:
    try:
        match = resolve(path)
        print(f"✅ {path} -> {match.view_name}")
    except Exception as e:
        print(f"❌ {path} -> FAILED: {str(e)}")

try:
    url = reverse('fournisseur-orders-create')
    print(f"🔄 Reverse 'fournisseur-orders-create' -> {url}")
except Exception as e:
    print(f"❌ Reverse FAILED: {str(e)}")

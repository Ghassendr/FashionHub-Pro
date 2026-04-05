import os
import django
from django.conf import settings
from rest_framework.test import APIRequestFactory, force_authenticate
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.client.api.views import handle_projects
from core.models import User

def test_post_project():
    factory = APIRequestFactory()
    user = User.objects.first()
    
    if not user:
        print("No user found in DB")
        return

    data = {
        "scan_result": {},
        "skin_result": {},
        "selected_designs": [],
        "selected_fabrics": [],
        "couture_house_id": "1",
        "status": "saved"
    }
    
    request = factory.post('/api/client/projects/', data, format='json')
    force_authenticate(request, user=user)
    
    response = handle_projects(request)
    print(f"Status: {response.status_code}")
    print(f"Content: {response.data}")

if __name__ == "__main__":
    test_post_project()

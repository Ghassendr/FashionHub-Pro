import os
import django
from django.conf import settings
from django.test import RequestFactory
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.client.api.views import handle_projects
from core.models import User

# Mock request
factory = RequestFactory()
request = factory.get('/api/client/projects/')

# Mock user (id=1, usually exists in dev)
try:
    user = User.objects.first()
    request.user = user
    
    response = handle_projects(request)
    print(f"Status Code: {response.status_code}")
    print(f"Content: {response.content.decode('utf-8')[:500]}")
except Exception as e:
    import traceback
    print("Caught Exception during diagnostic:")
    traceback.print_exc()

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

# Mock user
user = User.objects.first()
if not user:
    print("Error: No user found in database.")
    exit(1)

request.user = user

# Bypass DRF Auth for direct call
try:
    # Use ._callback if it's an API view or just call the function directly
    # since I imported handle_projects directly.
    # Note: handle_projects is decorated, so we might need to hit the underlying func
    # or just provide a mocked DRF request.
    
    from rest_framework.request import Request
    drf_request = Request(request)
    
    response = handle_projects(drf_request)
    print(f"Status Code: {response.status_code}")
    if hasattr(response, 'data'):
        print(f"Data: {response.data}")
    else:
        print(f"Content: {response.content.decode('utf-8')}")

except Exception as e:
    import traceback
    print("Caught Exception during diagnostic:")
    traceback.print_exc()

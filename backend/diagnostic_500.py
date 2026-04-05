import os
import django
from django.conf import settings
from rest_framework.test import APIRequestFactory, force_authenticate
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.api.views import get_profile # Guessing the path
from core.models.user import User

def test_get_profile():
    factory = APIRequestFactory()
    user = User.objects.filter(role='couture_house').first()
    if not user:
        user = User.objects.first()
        
    if not user:
        print("No user found")
        return

    print(f"Testing profile for user: {user.email} (Role: {user.role})")
    
    # We need to find where the view is actually defined. 
    # Usually it's in core/api/views.py if the URL is /api/auth/profile/
    from django.urls import resolve
    try:
        match = resolve('/api/auth/profile/')
        view_func = match.func
        
        request = factory.get('/api/auth/profile/')
        force_authenticate(request, user=user)
        
        response = view_func(request)
        print(f"Status: {response.status_code}")
        if response.status_code == 500:
            print("Error 500 detected!")
            # DRF usually doesn't return traceback in response.ata unless DEBUG=True
            print(f"Data: {response.data}")
    except Exception as e:
        print(f"Manual execution failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_get_profile()

import os
import django
import sys
from rest_framework.test import APIRequestFactory, force_authenticate
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.auth.views import ProfileView
from core.models.user import User

def get_traceback():
    print("--- Diagnostic Start ---")
    user = User.objects.filter(role='client').first()
    if not user:
        print("No client user found")
        return

    print(f"Authenticated as: {user.email}")
    factory = APIRequestFactory()
    request = factory.get('/api/auth/profile/')
    force_authenticate(request, user=user)
    
    view = ProfileView.as_view()
    
    try:
        response = view(request)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 500:
            print("Detected 500 error!")
            # Manually trigger the code to see where it crashes
            # because as_view() catches exceptions and returns JSON if DEBUG=False
            # but we want the raw traceback.
            view_instance = ProfileView()
            view_instance.request = request
            view_instance.format_kwarg = None
            view_instance.get(request)
        else:
            print(f"Response Data: {response.data}")
    except Exception:
        print("--- EXCEPTION CAUGHT ---")
        traceback.print_exc()
        print("--- EXCEPTION END ---")

if __name__ == "__main__":
    get_traceback()

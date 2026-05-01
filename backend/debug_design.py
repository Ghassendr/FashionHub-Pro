import os
import django
from rest_framework import serializers as drf_serializers
from rest_framework_mongoengine import serializers

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.couturehouse.models import Design
from actors.couturehouse.api.serializers import DesignWriteSerializer

def test_validation():
    data = {
        "title": "", # EMPTY
        "description": "Test Desc",
        "category": "dress",
        "fabric_suggestions": "Silk",
        "morphologies": ["H", "A"]
    }
    
    serializer = DesignWriteSerializer(data=data)
    if serializer.is_valid():
        print("Validation successful")
        try:
            # Simulate perform_create
            serializer.save(fashion_house_id=123)
            print("Save successful")
        except Exception as e:
            print(f"Save FAILED: {e}")
    else:
        print("Validation FAILED")
        print(serializer.errors)

if __name__ == '__main__':
    test_validation()

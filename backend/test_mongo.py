import os
import django
import sys

# Add backend to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.couturehouse.models import Design

def run_test():
    print("--- Testing MongoDB Connection ---")
    try:
        # 1. Clear previous test data (optional)
        # Design.objects.delete()
        
        # 2. Create a test design
        design = Design(
            title="Test Design from Script",
            fashion_house_id=1,
            description="Testing the new MongoEngine integration",
            category="dress"
        )
        design.save()
        print(f"✅ Design created successfully with ID: {design.id}")
        
        # 3. Retrieve it
        retrieved = Design.objects.get(id=design.id)
        print(f"✅ Retrieved design: {retrieved.title}")
        
        # 4. Count all
        count = Design.objects.count()
        print(f"✅ Total designs in MongoDB: {count}")
        
    except Exception as e:
        print(f"❌ Error during MongoDB test: {e}")

if __name__ == "__main__":
    run_test()

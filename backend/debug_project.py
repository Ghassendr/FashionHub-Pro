import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\xampp\\htdocs\\ProjetCTR\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from actors.client.models.models import ClientProject
from actors.couturehouse.models.models import Order
from actors.delivery.models.models import ShipmentRequest
from bson import ObjectId

def test_project(project_id, user_id):
    try:
        try:
            project = ClientProject.objects.get(id=ObjectId(project_id), client_id=user_id)
        except:
            project = ClientProject.objects.get(id=project_id, client_id=user_id)
        
        print(f"Found project: {project.id}")
        
        orders = Order.objects.filter(inquiry_id=str(project.id))
        print(f"Found {orders.count()} orders")
        
        for o in orders:
            print(f"Checking order {o.id}")
            # Try the query that might be failing
            suit_shipment = ShipmentRequest.objects.filter(client_order_id=o.id, fabric_order_id__isnull=True).exclude(status='cancelled').first()
            if suit_shipment:
                print(f"Found shipment: {suit_shipment.id}")
            else:
                print("No shipment found")
                
    except Exception as e:
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    # Test with the ID from the logs
    test_project('69f127dce1bd49964394b002', 1) # Assuming user_id 1

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import uuid
import datetime
from .db import vehicles_collection, trips_collection, orders_collection

class VehicleListView(APIView):
    """
    Handle GET (list all vehicles) and POST (create a new vehicle).
    """

    def get(self, request):
        if vehicles_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            # Fetch all vehicles
            vehicles_cursor = vehicles_collection.find()
            vehicles = []
            for v in vehicles_cursor:
                # Convert ObjectId to string for JSON serialization
                v['_id'] = str(v['_id'])
                vehicles.append(v)
            return Response(vehicles, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        if vehicles_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        data = request.data
        
        # Build document
        new_vehicle = {
            "vehicle_id": f"VEH-{str(uuid.uuid4())[:8].upper()}",
            "type": data.get("type", "Standard Van"),
            "make_model": data.get("make_model", "Unknown"),
            "registration": data.get("registration", "TBD"),
            "status": data.get("status", "Available"),
            "features": data.get("features", {}), # dict of custom features like { "Climate": "Yes", "Vault": "Lock" }
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        
        try:
            result = vehicles_collection.insert_one(new_vehicle)
            new_vehicle['_id'] = str(result.inserted_id)
            return Response(new_vehicle, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardKPIView(APIView):
    """
    Returns aggregated KPIs for the dashboard blocks.
    """
    def get(self, request):
        if vehicles_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            total_vehicles = vehicles_collection.count_documents({})
            active_vehicles = vehicles_collection.count_documents({"status": "En route"})
            idle_vehicles = vehicles_collection.count_documents({"status": "Idle"})
            available_vehicles = vehicles_collection.count_documents({"status": "Available"})
            maintenance_vehicles = vehicles_collection.count_documents({"status": "Maintenance"})
            
            # Additional placeholders for trips and orders 
            # (can be wired to those collections later)
            return Response({
                "fleet": {
                    "total": total_vehicles,
                    "active": active_vehicles,
                    "idle": idle_vehicles,
                    "available": available_vehicles,
                    "maintenance": maintenance_vehicles
                },
                "trips": {
                    "active": 3,
                    "completed": 5,
                    "scheduled": 1
                },
                "orders": {
                    "pending": 3,
                    "garment_flows": 5,
                    "fabric_flows": 2
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

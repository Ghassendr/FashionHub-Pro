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
            # Fleet stats
            total_vehicles = vehicles_collection.count_documents({})
            active_vehicles = vehicles_collection.count_documents({"status": "En route"})
            idle_vehicles = vehicles_collection.count_documents({"status": "Idle"})
            available_vehicles = vehicles_collection.count_documents({"status": "Available"})
            maintenance_vehicles = vehicles_collection.count_documents({"status": "Maintenance"})
            
            # Trip stats
            active_trips = trips_collection.count_documents({"status": "Active"})
            completed_trips = trips_collection.count_documents({"status": "Completed"})
            scheduled_trips = trips_collection.count_documents({"status": "Scheduled"})

            # Order stats
            pending_orders = orders_collection.count_documents({"status": "Pending"})
            garment_flows = orders_collection.count_documents({"type": "Garment"})
            fabric_flows = orders_collection.count_documents({"type": "Fabric"})

            return Response({
                "fleet": {
                    "total": total_vehicles,
                    "active": active_vehicles,
                    "idle": idle_vehicles,
                    "available": available_vehicles,
                    "maintenance": maintenance_vehicles
                },
                "trips": {
                    "active": active_trips,
                    "completed": completed_trips,
                    "scheduled": scheduled_trips
                },
                "orders": {
                    "pending": pending_orders,
                    "garment_flows": garment_flows,
                    "fabric_flows": fabric_flows
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TripListView(APIView):
    def get(self, request):
        if trips_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            trips_cursor = trips_collection.find()
            trips = []
            for t in trips_cursor:
                t['_id'] = str(t['_id'])
                trips.append(t)
            return Response(trips, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        if trips_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = request.data
        new_trip = {
            "trip_id": f"T-{str(uuid.uuid4())[:4].upper()}",
            "route": data.get("route", "Unknown"),
            "driver": data.get("driver", "Unassigned"),
            "vehicle": data.get("vehicle", "Not Specified"),
            "orders": data.get("orders", []),
            "eta": data.get("eta", "TBD"),
            "status": data.get("status", "Active"),
            "progress": data.get("progress", 0),
            "type": data.get("type", "Mixed"),
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        try:
            result = trips_collection.insert_one(new_trip)
            new_trip['_id'] = str(result.inserted_id)
            
            # Additional logic: Mark chosen orders as "En route"
            for oid in new_trip["orders"]:
                # If oid is string ID, we might need ObjectId, but UI sends string ID or order_id
                # Assuming UI sends `order_id` string like "ORD-XYZ"
                orders_collection.update_one({"order_id": oid}, {"$set": {"status": "En route", "priority": "In transit"}})
            
            return Response(new_trip, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderListView(APIView):
    def get(self, request):
        if orders_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            orders_cursor = orders_collection.find()
            orders = []
            for o in orders_cursor:
                o['_id'] = str(o['_id'])
                orders.append(o)
            return Response(orders, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        if orders_collection is None:
            return Response({"error": "MongoDB not connected."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = request.data
        new_order = {
            "order_id": f"ORD-{str(uuid.uuid4())[:4].upper()}",
            "route": data.get("route", "Unknown"),
            "house": data.get("house", "Unknown House"),
            "type": data.get("type", "Unknown Flow"),
            "priority": data.get("priority", "Normal"),
            "status": data.get("status", "Pending"),
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        try:
            result = orders_collection.insert_one(new_order)
            new_order['_id'] = str(result.inserted_id)
            return Response(new_order, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

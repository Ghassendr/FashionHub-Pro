from mongoengine.connection import get_db
import os

# Use the existing authenticated connection from mongoengine (initialized in settings.py)
try:
    db = get_db()
    
    # Collections
    vehicles_collection = db["vehicles"]
    trips_collection = db["trips"]
    orders_collection = db["orders"]
    
except Exception as e:
    print(f"Error accessing MongoDB via mongoengine: {e}")
    vehicles_collection = None
    trips_collection = None
    orders_collection = None

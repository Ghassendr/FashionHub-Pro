from pymongo import MongoClient
import os

# Create a singleton MongoDB client to avoid multiple connection pools
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "projet_ctr_delivery"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Collections
    vehicles_collection = db["vehicles"]
    trips_collection = db["trips"]
    orders_collection = db["orders"]
    
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    db = None

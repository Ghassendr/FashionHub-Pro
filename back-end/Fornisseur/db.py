import pymongo
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "fashionhub_pro"

client = None
db = None

def get_db():
    global client, db
    if client is None:
        client = MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
    return db

def get_users_collection():
    return get_db()['users']

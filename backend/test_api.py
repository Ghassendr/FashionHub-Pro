import requests
import sys

base_url = "http://127.0.0.1:8000/api"

try:
    print("Registering new carrier...")
    reg_res = requests.post(f"{base_url}/strategie_livraison/register/", json={
        "username": "testcarrier3",
        "password": "testpassword123",
        "company_name": "Test Carrier 3 Inc",
        "email": "test@carrier3.com"
    }, timeout=5)
    print("Registration response:", reg_res.status_code, reg_res.text)
except Exception as e:
    print("Error:", e)

try:
    print("Getting token...")
    auth_res = requests.post(f"{base_url}/token/", json={
        "username": "testcarrier3",
        "password": "testpassword123"
    }, timeout=5)
    print("Auth response:", auth_res.status_code)
    
    if auth_res.status_code == 200:
        token = auth_res.json().get("access")
        
        print("Creating vehicle...")
        try:
            veh_res = requests.post(f"{base_url}/strategie_livraison/vehicles/", json={
                "registration_number": "XX-123-ZZ",
                "capacity_kg": 1500,
                "vehicle_type": "VAN",
                "is_available": True
            }, headers={
                "Authorization": f"Bearer {token}"
            }, timeout=5)
            print("Vehicle creation response:", veh_res.status_code, veh_res.text)
        except Exception as e:
            print("Error creating vehicle:", e)
except Exception as e:
    print("Error:", e)

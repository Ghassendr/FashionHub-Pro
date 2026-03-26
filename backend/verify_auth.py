import os
import requests
import json

BACKEND_URL = "http://localhost:8000"

def test_all_roles():
    roles = [
        ("client_user", "client", {"phone": "123", "address": "Rue 1"}),
        ("couture_user", "couture_house", {"house_name": "Atelier 1", "specialization": "Bridal"}),
        ("delivery_user", "delivery", {"company_name": "Express", "service_type": "Fast"}),
        ("supplier_user", "fournisseur", {"nomOrganization": "FabCo", "fabric_category": "Silk", "origin_country": "France", "min_price_per_meter": 25.0}),
    ]
    
    import time
    timestamp = int(time.time())

    for username, role, profile_data in roles:
        print(f"\n--- Testing {role} Registration ---")
        payload = {
            "username": f"{username}_{timestamp}",
            "email": f"{username}_{timestamp}@test.com",
            "password": "password123",
            "role": role,
            "profile_data": profile_data
        }
        resp = requests.post(f"{BACKEND_URL}/api/auth/register/", json=payload)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 201:
            print(f"Success! User {username} registered. Status: {resp.json()['status']}")
        else:
            print(f"Error: {resp.json()}")

def test_admin_approval(admin_token):
    print("\n--- Testing Admin Approval ---")
    headers = {"Authorization": f"Bearer {admin_token}"}
    queue = requests.get(f"{BACKEND_URL}/api/auth/admin/review-queue/", headers=headers).json()
    print(f"Queue Size: {len(queue)}")
    if queue:
        user_id = queue[0]['id']
        print(f"Approving user ID: {user_id} ({queue[0]['username']})")
        resp = requests.post(f"{BACKEND_URL}/api/auth/admin/review-action/{user_id}/", 
                             json={"action": "approve"}, headers=headers)
        print(f"Action Status: {resp.status_code}")
        print(f"Response: {resp.json()}")

if __name__ == "__main__":
    try:
        test_all_roles()
        # Use email-based login for admin
        admin_payload = {"email": "admin@example.com", "password": "password123"}
        admin_resp = requests.post(f"{BACKEND_URL}/api/auth/login/", json=admin_payload)
        if admin_resp.status_code == 200:
            admin_token = admin_resp.json().get("access")
            test_admin_approval(admin_token)
        else:
            print(f"Admin Login Failed: {admin_resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

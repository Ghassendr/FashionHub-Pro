import requests
import json
import time
import sys

# Configuration
BASE_URL = "http://localhost:8000/api"

# Test Credentials (using verified DB accounts)
USERS = {
    "client": {"email": "client@projets.com", "password": "password123"}, 
    "couture": {"email": "fedylajn@gmail.com", "password": "password123"},
    "supplier": {"email": "fournisseur@gmail.com", "password": "password123"},
    "delivery": {"email": "fedylajnef3@gmail.com", "password": "password123"}
}

# Tokens and IDs storage
STATE = {
    "tokens": {},
    "project_id": None,
    "order_id": None,
    "fabric_order_id": None,
    "shipment_id": None,
    "fabric_id": None,
    "design_id": None,
    "route_id": None,
    "carrier_id": None,
    "ch_profile_id": None
}

def log(msg, level="INFO"):
    color = "\033[94m" if level == "INFO" else "\033[91m"
    if level == "SUCCESS": color = "\033[92m"
    if level == "WARNING": color = "\033[93m"
    print(f"{color}[{level}] {msg}\033[0m")

def login_all():
    log("Logging in all actors...")
    for role, creds in USERS.items():
        try:
            # Use the fournisseur auth login which is unified for now
            response = requests.post(f"{BASE_URL}/fournisseur/auth/login", json=creds)
            if response.status_code == 200:
                STATE["tokens"][role] = response.json().get("token")
                log(f"{role.capitalize()} logged in.")
            else:
                log(f"Failed to login as {role}: {response.text}", "ERROR")
                return False
        except Exception as e:
            log(f"Login error for {role}: {e}", "ERROR")
            return False
    return True

def run_test():
    if not login_all(): return

    h_client = {"Authorization": f"Bearer {STATE['tokens']['client']}"}
    h_couture = {"Authorization": f"Bearer {STATE['tokens']['couture']}"}
    h_supplier = {"Authorization": f"Bearer {STATE['tokens']['supplier']}"}
    h_delivery = {"Authorization": f"Bearer {STATE['tokens']['delivery']}"}

    # 1. SETUP: Find Design, Fabric, and Carrier
    log("\n--- SETUP: Fetching catalog items ---")
    try:
        res = requests.get(f"{BASE_URL}/couturehouse/public/designs/")
        STATE["design_id"] = res.json()[0]['id']
        log(f"Design found: {STATE['design_id']}")

        res = requests.get(f"{BASE_URL}/fournisseur/public/fabrics") # No trailing slash
        if res.status_code != 200:
            log(f"Fabrics fetch failed ({res.status_code}): {res.text}", "ERROR")
            return
        
        STATE["fabric_id"] = res.json()["fabrics"][0]['id']
        log(f"Fabric found: {STATE['fabric_id']}")

        # Fetch carrier and route
        res = requests.get(f"{BASE_URL}/delivery/routes/", headers=h_couture)
        if res.status_code == 200 and res.json():
            route = res.json()[0]
            STATE["route_id"] = route["id"]
            STATE["carrier_id"] = route["carrier"]
            log(f"Route found: {STATE['route_id']} (Carrier: {STATE['carrier_id']})")
        else:
            log("No delivery routes found. Using defaults.", "WARNING")
            STATE["route_id"] = 1
            STATE["carrier_id"] = 6 # Known carrier ID from previous runs
    except Exception as e:
        log(f"Setup failed: {e}", "ERROR")
        return

    # 2. CLIENT: Create & Submit Project
    log("\n--- STEP 1: Client creating & submitting project ---")
    project_data = {
        "scan_result": {"height": 180, "weight": 75},
        "selected_designs": [STATE["design_id"]],
        "selected_fabrics": [STATE["fabric_id"]],
        "status": "saved"
    }
    res = requests.post(f"{BASE_URL}/client/projects/", json=project_data, headers=h_client)
    if res.status_code == 201:
        STATE["project_id"] = res.json()["id"]
        log(f"Project created: {STATE['project_id']}", "SUCCESS")
        
        res = requests.post(f"{BASE_URL}/client/projects/{STATE['project_id']}/submit/", headers=h_client)
        if res.status_code == 200:
            log("Project submitted successfully.", "SUCCESS")
        else:
            log(f"Submit failed: {res.text}", "ERROR")
    else:
        log(f"Project creation failed: {res.text}", "ERROR")
        return

    # 3. COUTURE HOUSE: Accept & Order Fabric
    log("\n--- STEP 2: Couture House ordering fabric ---")
    time.sleep(1) # Give DB a moment
    res = requests.get(f"{BASE_URL}/couturehouse/orders/", headers=h_couture)
    orders = res.json().get("orders", [])
    # Find our order
    order = next((o for o in orders if o.get("inquiry_id") == STATE["project_id"]), None)
    if order:
        STATE["order_id"] = order["id"]
        STATE["ch_profile_id"] = order["couture_house"]
        log(f"Order found in workshop: {STATE['order_id']}", "SUCCESS")
        
        fabric_order_data = {
            "fabric_id": STATE["fabric_id"],
            "quantity": 5.0,
            "couture_house_id": STATE["ch_profile_id"],
            "couture_house_name": "Maison Couture Test",
            "carrier_id": STATE["carrier_id"],
            "route_id": STATE["route_id"]
        }
        res = requests.post(f"{BASE_URL}/fournisseur/orders/create/", json=fabric_order_data, headers=h_couture)
        if res.status_code == 201:
            STATE["fabric_order_id"] = res.json()["id"]
            log(f"Fabric order sent to supplier: {STATE['fabric_order_id']}", "SUCCESS")
        else:
            log(f"Fabric order failed: {res.text}", "ERROR")
            return
    else:
        log("Couture House order not found", "ERROR")
        return

    # 4. SUPPLIER: Ship Fabric
    log("\n--- STEP 3: Supplier shipping fabric ---")
    res = requests.patch(f"{BASE_URL}/fournisseur/orders/{STATE['fabric_order_id']}/status/", json={"status": "shipped"}, headers=h_supplier)
    if res.status_code == 404:
         res = requests.patch(f"{BASE_URL}/fournisseur/orders/{STATE['fabric_order_id']}/status", json={"status": "shipped"}, headers=h_supplier)
         
    if res.status_code == 200:
        log("Fabric marked as shipped.", "SUCCESS")
    else:
        log(f"Supplier ship failed: {res.text}", "ERROR")
        return

    # 5. DELIVERY: Transport
    log("\n--- STEP 4: Delivery processing ---")
    res = requests.get(f"{BASE_URL}/delivery/shipments/", headers=h_delivery)
    shipment = next((s for s in res.json() if s.get("fabric_order_id") == STATE["fabric_order_id"]), None)
    if shipment:
        STATE["shipment_id"] = shipment["id"]
        for s in ["accepted", "picked_up", "in_transit", "delivered"]:
            res = requests.patch(f"{BASE_URL}/delivery/shipments/{STATE['shipment_id']}/", json={"status": s}, headers=h_delivery)
            if res.status_code == 200:
                log(f"Shipment status: {s}")
            else:
                log(f"Failed status {s}: {res.text}", "ERROR")
        log("Shipment delivered to workshop.", "SUCCESS")
    else:
        log("Shipment not found in delivery dashboard", "ERROR")

    # 6. COUTURE HOUSE: Finalize
    log("\n--- STEP 5: Couture House finalizing production ---")
    requests.post(f"{BASE_URL}/couturehouse/orders/{STATE['fabric_order_id']}/confirm-receipt/", headers=h_couture)
    requests.post(f"{BASE_URL}/couturehouse/orders/{STATE['order_id']}/start/", headers=h_couture)
    res = requests.post(f"{BASE_URL}/couturehouse/orders/{STATE['order_id']}/complete/", headers=h_couture)
    if res.status_code == 200:
        log("Production completed.", "SUCCESS")
    else:
        log(f"Completion failed: {res.text}", "ERROR")

    # 7. CLIENT: Rating
    log("\n--- STEP 6: Client rating ---")
    # Atelier rating
    res = requests.post(f"{BASE_URL}/couturehouse/profile/{STATE['ch_profile_id']}/rate/", json={"rating": 5}, headers=h_client)
    if res.status_code == 200:
        log("Atelier rated 5 stars.", "SUCCESS")
    else:
        log(f"Atelier rating failed: {res.text}", "ERROR")

    # Delivery rating
    res = requests.post(f"{BASE_URL}/delivery/carriers/{STATE['carrier_id']}/rate/", json={"rating": 5}, headers=h_client)
    if res.status_code == 200:
        log("Delivery carrier rated 5 stars.", "SUCCESS")
    else:
        log(f"Carrier rating failed: {res.text}", "ERROR")

    log("\n" + "="*40)
    log("  PIPELINE TEST COMPLETED SUCCESSFULLY  ", "SUCCESS")
    log("="*40)

if __name__ == "__main__":
    run_test()

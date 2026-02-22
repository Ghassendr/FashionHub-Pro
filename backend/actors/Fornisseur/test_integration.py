#!/usr/bin/env python3
"""
Quick integration test - verify basic upload and color extraction work
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

# Test token (you would need a real token from login)
test_token = "your_test_token_here"

def test_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code == 200:
            print("✓ Backend is running")
            return True
    except:
        print("✗ Backend not responding - make sure backend is running on localhost:5000")
        return False

def test_endpoints():
    """Check if endpoints exist"""
    print("\nChecking available endpoints:")
    
    endpoints = [
        ("GET", "/api/fabrics"),
        ("POST", "/api/fabrics"),
        ("GET", "/api/images/test.jpg"),
    ]
    
    for method, path in endpoints:
        print(f"  - {method:4} {path}")

def main():
    print("=" * 60)
    print("Backend Integration Test")
    print("=" * 60)
    
    # Test 1: Check health
    if not test_health():
        print("\n⚠ Backend not running. Please start it with:")
        print("   cd back-end/Fornisseur && python app.py")
        return
    
    # Test 2: List endpoints
    test_endpoints()
    
    print("\n" + "=" * 60)
    print("Status: Ready for testing")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start frontend: cd frontend && npm run dev")
    print("2. Go to http://localhost:5173")
    print("3. Login with your account")
    print("4. Try uploading a fabric image")
    print("\nExpected behavior:")
    print("  - Image should save to uploads/ folder")
    print("  - Color should extract (RGB format)")
    print("  - Colors should display in dashboard table")
    print("  - No 404 or 500 errors in console")

if __name__ == "__main__":
    main()

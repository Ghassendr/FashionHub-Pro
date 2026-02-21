import requests
import os
import time

filepath = r'c:\Users\ghass\OneDrive\Desktop\outil\back-end\uploads\308695c8.mp4'
url = 'http://localhost:5000/process'

print(f"Final Verification with {filepath}...")

try:
    with open(filepath, 'rb') as f:
        r = requests.post(url, files={'video': f}, data={'height': 175.0, 'weight': 70.0})
    
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        res = r.json()
        print(f"SUCCESS! Run ID: {res.get('id')}")
        print(f"Measurements found: {len(res.get('measurements', {}).get('basics', []))}")
    else:
        print(f"Error: {r.text}")
except Exception as e:
    print(f"Tests failed: {e}")

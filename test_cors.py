import urllib.request
import json

# Test OPTIONS preflight
print("Testing CORS preflight OPTIONS request...")
try:
    req = urllib.request.Request(
        'http://localhost:5000/api/fabrics',
        method='OPTIONS',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
    )
    response = urllib.request.urlopen(req)
    print(f"✓ OPTIONS status: {response.status}")
    print("✓ CORS Response Headers:")
    for header in response.headers:
        if 'access-control' in header.lower() or 'allow' in header.lower():
            print(f"  {header}: {response.headers[header]}")
except Exception as e:
    print(f"✗ Error: {e}")

print("\nTesting GET /api/fabrics without token...")
try:
    req = urllib.request.Request(
        'http://localhost:5000/api/fabrics',
        headers={'Origin': 'http://localhost:5173'}
    )
    response = urllib.request.urlopen(req)
    print(f"Status: {response.status}")
except urllib.error.HTTPError as e:
    print(f"Expected 401: {e.code}")
    print("✓ Endpoint is accessible")
except Exception as e:
    print(f"✗ Error: {e}")

#!/usr/bin/env python
"""
Start the Flask backend server
"""
import sys
import os

# Ensure we're in the right directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("STARTING FLASK BACKEND SERVER")
print("=" * 70)

try:
    print("[1/3] Loading app...")
    from app import app
    print("✓ App loaded successfully")
    
    print("[2/3] Configuring server...")
    print("  • Host: 0.0.0.0")
    print("  • Port: 5000")
    print("  • Debug: False")
    print("  • CORS: Enabled")
    
    print("[3/3] Starting server...")
    print("=" * 70)
    print("Server running at: http://localhost:5000")
    print("Health check: http://localhost:5000/health")
    print("=" * 70)
    print()
    
    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
    
except ImportError as e:
    print(f"✗ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

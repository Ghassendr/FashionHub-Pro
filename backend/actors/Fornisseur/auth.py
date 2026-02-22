import jwt
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta

SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

def hash_password(password):
    """Hash password using werkzeug"""
    return generate_password_hash(password)

def verify_password(password, hash):
    """Verify password against hash"""
    return check_password_hash(hash, password)

def generate_token(user_id):
    """Generate JWT token"""
    payload = {
        'user_id': str(user_id),
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except:
        return None

def extract_token(header):
    """Extract token from Authorization header"""
    if not header:
        return None
    parts = header.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None

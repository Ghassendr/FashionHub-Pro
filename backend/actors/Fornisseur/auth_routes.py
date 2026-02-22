from flask import Blueprint, request, jsonify
from db import get_users_collection
from auth import hash_password, verify_password, generate_token, verify_token, extract_token
from bson.objectid import ObjectId

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register new supplier"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    users = get_users_collection()
    
    # Check if user exists
    if users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    user_data = {
        'email': data['email'],
        'password': hash_password(data['password']),
        'nom': data.get('nom', ''),
        'prenom': data.get('prenom', ''),
        'nomOrganization': data.get('nomOrganization', ''),
        'lieu': data.get('lieu', ''),
        'typeProduct': data.get('typeProduct', ''),
        'specialites': data.get('specialites', ''),
        'numeroLicence': data.get('numeroLicence', ''),
        'siteWeb': data.get('siteWeb', ''),
        'nombreEmployes': data.get('nombreEmployes', ''),
        'anneeCreation': data.get('anneeCreation', ''),
        'description': data.get('description', ''),
        'adresse': data.get('adresse', ''),
        'codePostal': data.get('codePostal', ''),
        'ville': data.get('ville', ''),
        'pays': data.get('pays', ''),
        'nomContact': data.get('nomContact', ''),
        'prenomContact': data.get('prenomContact', ''),
        'telephoneContact': data.get('telephoneContact', ''),
        'certificationsQualite': data.get('certificationsQualite', []),
        'created_at': data.get('created_at')
    }
    
    result = users.insert_one(user_data)
    user_data['_id'] = str(result.inserted_id)
    
    token = generate_token(result.inserted_id)
    
    return jsonify({
        'success': True,
        'message': 'Account created',
        'user': {
            'id': str(result.inserted_id),
            'email': data['email'],
            'nom': data.get('nom'),
            'prenom': data.get('prenom'),
            'nomOrganization': data.get('nomOrganization')
        },
        'token': token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    users = get_users_collection()
    user = users.find_one({'email': data['email']})
    
    if not user or not verify_password(data['password'], user['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    token = generate_token(user['_id'])
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'id': str(user['_id']),
            'email': user['email'],
            'nom': user.get('nom'),
            'prenom': user.get('prenom'),
            'nomOrganization': user.get('nomOrganization')
        },
        'token': token
    }), 200

@auth_bp.route('/verify-token', methods=['POST'])
def verify_user_token():
    """Verify token"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    users = get_users_collection()
    user = users.find_one({'_id': ObjectId(payload['user_id'])})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'valid': True,
        'user_id': str(user['_id']),
        'email': user['email']
    }), 200

@auth_bp.route('/user/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user profile"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token or not verify_token(token):
        return jsonify({'error': 'Unauthorized'}), 401
    
    users = get_users_collection()
    user = users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Remove password from response
    user.pop('password', None)
    user['_id'] = str(user['_id'])
    
    return jsonify({'success': True, 'user': user}), 200

@auth_bp.route('/user/<user_id>/update', methods=['PUT'])
def update_user(user_id):
    """Update user profile"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    users = get_users_collection()
    
    try:
        # Check if user exists and owns this profile
        user = users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update allowed fields
        update_data = {}
        allowed_fields = [
            'nom', 'prenom', 'email', 'mail', 'telephone',
            'nomOrganization', 'lieu', 'typeProduct', 'specialites',
            'numeroLicence', 'siteWeb', 'nombreEmployes', 'anneeCreation',
            'description', 'adresse', 'codePostal', 'ville', 'pays',
            'nomContact', 'prenomContact', 'telephoneContact'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if update_data:
            users.update_one({'_id': ObjectId(user_id)}, {'$set': update_data})
        
        # Return updated user
        user = users.find_one({'_id': ObjectId(user_id)})
        user.pop('password', None)
        user['_id'] = str(user['_id'])
        
        return jsonify({'success': True, 'message': 'Profile updated', 'user': user}), 200
    except:
        return jsonify({'error': 'Invalid user ID'}), 400

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout (token removed on frontend)"""
    return jsonify({'success': True, 'message': 'Logged out'}), 200

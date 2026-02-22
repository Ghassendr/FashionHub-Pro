from flask import Blueprint, request, jsonify
from db import get_users_collection, get_db
from auth import verify_token, extract_token
from bson.objectid import ObjectId
from bson.binary import Binary
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from color_extractor import extract_main_color

fabrics_bp = Blueprint('fabrics', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    """Check if file is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_fabrics_collection():
    db = get_db()
    return db['fabrics']

@fabrics_bp.route('/fabrics', methods=['GET'])
def get_fabrics():
    """Get all fabrics for logged-in user"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    user_id = payload['user_id']
    fabrics_coll = get_fabrics_collection()
    
    # Exclude image binary data from list view
    fabrics = list(fabrics_coll.find({'user_id': user_id}, {'image': 0}))
    
    # Convert ObjectId to string for JSON
    for fabric in fabrics:
        fabric['_id'] = str(fabric['_id'])
    
    return jsonify({'fabrics': fabrics}), 200

@fabrics_bp.route('/fabrics', methods=['POST'])
def create_fabric():
    """Create new fabric with image upload and color extraction"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    user_id = payload['user_id']
    
    # Check if image file is present
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed. Use: png, jpg, jpeg, gif, webp'}), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': 'File size exceeds 5MB limit'}), 400
    
    try:
        # Extract main dominant color and get image bytes
        rgb_color, image_bytes = extract_main_color(file)
        
        if image_bytes is None:
            return jsonify({'error': 'Failed to process image'}), 500
        
        # Get form data
        quantite = request.form.get('quantite')
        
        if not quantite:
            return jsonify({'error': 'Quantity is required'}), 400
        
        # Create fabric record with image stored in MongoDB
        fabric_data = {
            'user_id': user_id,
            'image': Binary(image_bytes),  # Store as binary in MongoDB
            'color': list(rgb_color),  # Store as [R, G, B]
            'quantite': float(quantite),
            'materiel': request.form.get('materiel', ''),
            'prix': float(request.form.get('prix', 0)),
            'description': request.form.get('description', ''),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        fabrics_coll = get_fabrics_collection()
        result = fabrics_coll.insert_one(fabric_data)
        
        # Prepare response (convert Binary back for response)
        response_fabric = {key: value for key, value in fabric_data.items() if key != 'image'}
        response_fabric['_id'] = str(result.inserted_id)
        
        return jsonify({
            'message': 'Fabric created successfully',
            'fabric': response_fabric,
            'color': list(rgb_color)
        }), 201
    
    except Exception as e:
        return jsonify({'error': f'Failed to create fabric: {str(e)}'}), 500

@fabrics_bp.route('/fabrics/<fabric_id>', methods=['GET'])
def get_fabric(fabric_id):
    """Get specific fabric"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    try:
        fabrics_coll = get_fabrics_collection()
        fabric = fabrics_coll.find_one({
            '_id': ObjectId(fabric_id),
            'user_id': payload['user_id']
        }, {'image': 0})
        
        if not fabric:
            return jsonify({'error': 'Fabric not found'}), 404
        
        fabric['_id'] = str(fabric['_id'])
        return jsonify({'fabric': fabric}), 200
    except:
        return jsonify({'error': 'Invalid fabric ID'}), 400

@fabrics_bp.route('/fabrics/<fabric_id>', methods=['PUT'])
def update_fabric(fabric_id):
    """Update fabric"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    try:
        fabrics_coll = get_fabrics_collection()
        
        # Check if user owns this fabric
        fabric = fabrics_coll.find_one({
            '_id': ObjectId(fabric_id),
            'user_id': payload['user_id']
        })
        
        if not fabric:
            return jsonify({'error': 'Fabric not found'}), 404
        
        update_data = {
            'updated_at': datetime.utcnow()
        }
        
        # Check if new image is uploaded
        if 'image' in request.files:
            file = request.files['image']
            
            if file and file.filename != '' and allowed_file(file.filename):
                # Save new image
                filename, filepath = save_image(file, UPLOAD_FOLDER, payload['user_id'])
                
                if filename:
                    update_data['image'] = filename
                    update_data['image_path'] = filepath
                    
                    # Extract main dominant color from new image
                    rgb_color = extract_main_color(filepath)
                    update_data['color'] = list(rgb_color)
        
        # Update other fields from form data
        if 'quantite' in request.form:
            update_data['quantite'] = float(request.form['quantite'])
        if 'materiel' in request.form:
            update_data['materiel'] = request.form['materiel']
        if 'prix' in request.form:
            update_data['prix'] = float(request.form['prix'])
        if 'description' in request.form:
            update_data['description'] = request.form['description']
        
        fabrics_coll.update_one(
            {'_id': ObjectId(fabric_id)},
            {'$set': update_data}
        )
        
        fabric = fabrics_coll.find_one({'_id': ObjectId(fabric_id)}, {'image': 0})
        fabric['_id'] = str(fabric['_id'])
        fabric.pop('image_path', None)  # Remove server path from response
        
        return jsonify({'message': 'Fabric updated', 'fabric': fabric}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to update fabric: {str(e)}'}), 500

@fabrics_bp.route('/fabrics/<fabric_id>', methods=['DELETE'])
def delete_fabric(fabric_id):
    """Delete fabric"""
    token = extract_token(request.headers.get('Authorization'))
    
    if not token:
        return jsonify({'error': 'No token provided'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid token'}), 401
    
    try:
        fabrics_coll = get_fabrics_collection()
        
        result = fabrics_coll.delete_one({
            '_id': ObjectId(fabric_id),
            'user_id': payload['user_id']
        })
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Fabric not found'}), 404
        
        return jsonify({'message': 'Fabric deleted'}), 200
    except:
        return jsonify({'error': 'Invalid fabric ID'}), 400


@fabrics_bp.route('/images/<fabric_id>', methods=['GET'])
def get_image(fabric_id):
    """Serve fabric image stored in MongoDB"""
    try:
        import mimetypes
        from base64 import b64encode
        
        token = extract_token(request.headers.get('Authorization'))
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Retrieve image from MongoDB by fabric ID
        fabrics_coll = get_fabrics_collection()
        fabric = fabrics_coll.find_one({
            '_id': ObjectId(fabric_id),
            'user_id': payload['user_id']
        })
        
        if not fabric:
            return jsonify({'error': 'Fabric not found'}), 404
        
        if 'image' not in fabric or fabric['image'] is None:
            return jsonify({'error': 'Image not found'}), 404
        
        # Get image bytes from MongoDB
        image_data = fabric['image']
        if isinstance(image_data, Binary):
            image_bytes = bytes(image_data)
        else:
            image_bytes = image_data
        
        # Encode as base64
        image_b64 = b64encode(image_bytes).decode('utf-8')
        
        # Determine MIME type (most fabric images are JPEG)
        mime_type = 'image/jpeg'
        
        # Return as data URL for direct use in img src
        data_url = f"data:{mime_type};base64,{image_b64}"
        return jsonify({'image': data_url, 'mime_type': mime_type}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve image: {str(e)}'}), 500

"""
FashionHub Pro - Supplier Authentication Service
Simple Flask app for supplier authentication
"""

from flask import Flask
from flask_cors import CORS
from auth_routes import auth_bp
from fabrics_routes import fabrics_bp
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Configure CORS explicitly
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(fabrics_bp, url_prefix='/api')

@app.route('/', methods=['GET'])
def health():
    """Health check"""
    return {'status': 'ok', 'message': 'Supplier Auth Server Running'}, 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health endpoint"""
    return {'message': 'Server is running'}, 200

if __name__ == '__main__':
    logger.info("Starting FashionHub Pro Supplier Auth Server")
    app.run(debug=True, host='0.0.0.0', port=5000)

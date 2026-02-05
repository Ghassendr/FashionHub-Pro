"""
360° Precision AI - Flask Backend
Plateforme d'extraction morphologique pour maisons de couture
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from body_processor import BodyProcessor
# visualization.py excluded as frontend handles viz

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize processor
processor = BodyProcessor()

@app.route('/')
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "360° Precision AI Server Running"})


@app.route('/process', methods=['POST'])
def process():
    """
    Process a 360° video and extract body measurements
    
    Form data:
        - video: Video file
        - height: Height in cm
        - weight: Weight in kg
        - age: Age (optional)
        - gender: 'men' or 'women'
        - cut_preference: Cut preference (optional)
    
    Returns:
        JSON with complete analysis results
    """
    if 'video' not in request.files:
        return jsonify({'error': 'No video provided'}), 400
    
    video = request.files['video']
    if not video.filename:
        return jsonify({'error': 'No video selected'}), 400
    
    # Get form data
    height = float(request.form.get('height', 175.0))
    weight = float(request.form.get('weight', 70.0))
    age_str = request.form.get('age', '')
    age = int(age_str) if age_str and age_str.isdigit() else None
    gender = request.form.get('gender', 'men')
    cut_preference = request.form.get('cut_preference', None)
    if cut_preference == '':
        cut_preference = None
    
    # Save video
    filename = video.filename
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    video.save(save_path)
    
    logger.info(f"Processing video: {filename} for {height}cm, {weight}kg, age={age}, gender={gender}")
    
    try:
        # Process video
        result = processor.process(
            save_path, 
            RESULTS_FOLDER, 
            height_cm=height, 
            weight_kg=weight,
            age=age,
            gender=gender,
            cut_preference=cut_preference
        )
        
        # Generate visualizations
        try:
            run_dir = os.path.join(RESULTS_FOLDER, result['id'])
            plots = plot_generator.generate_all(result, run_dir)
            result['plots'] = plots
        except Exception as e:
            logger.warning(f"Plot generation error: {e}")
            result['plots'] = {}
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/results/<path:filepath>')
def serve_results(filepath):
    """Serve result files (meshes, images, JSON, etc.)"""
    full_path = os.path.join(RESULTS_FOLDER, filepath)
    
    # If it's a directory (run_id only), return the result.json
    if os.path.isdir(full_path):
        result_json = os.path.join(full_path, 'result.json')
        if os.path.exists(result_json):
            import json
            with open(result_json, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        return jsonify({'error': 'Result not found'}), 404
    
    # Otherwise serve the file directly
    if os.path.exists(full_path):
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        return send_from_directory(os.path.join(RESULTS_FOLDER, os.path.dirname(filepath)), filename)
    
    return jsonify({'error': 'File not found'}), 404


@app.route('/api/measurements/<run_id>')
def get_measurements(run_id):
    """Get measurements for a specific run"""
    import json
    result_path = os.path.join(RESULTS_FOLDER, run_id, 'result.json')
    
    if not os.path.exists(result_path):
        return jsonify({'error': 'Result not found'}), 404
    
    with open(result_path, 'r', encoding='utf-8') as f:
        result = json.load(f)
    
    return jsonify(result.get('measurements', {}))


@app.route('/api/recommendations/<run_id>')
def get_recommendations(run_id):
    """Get fashion recommendations for a specific run"""
    import json
    result_path = os.path.join(RESULTS_FOLDER, run_id, 'result.json')
    
    if not os.path.exists(result_path):
        return jsonify({'error': 'Result not found'}), 404
    
    with open(result_path, 'r', encoding='utf-8') as f:
        result = json.load(f)
    
    return jsonify(result.get('fashion_recommendations', {}))


@app.route('/api/correct/<run_id>', methods=['POST'])
def correct_measurements(run_id):
    """
    Correct measurements based on user input
    
    JSON body:
        - measurement_key: The key of the measurement to correct
        - new_value: The corrected value in cm
    """
    import json
    result_path = os.path.join(RESULTS_FOLDER, run_id, 'result.json')
    
    if not os.path.exists(result_path):
        return jsonify({'error': 'Result not found'}), 404
    
    data = request.get_json()
    if not data or 'measurement_key' not in data or 'new_value' not in data:
        return jsonify({'error': 'Invalid correction data'}), 400
    
    with open(result_path, 'r', encoding='utf-8') as f:
        result = json.load(f)
    
    # Find and update the measurement
    measurement_key = data['measurement_key']
    new_value = float(data['new_value'])
    
    for category in ['basics', 'heights', 'widths', 'functional']:
        if category not in result.get('measurements', {}):
            continue
        for m in result['measurements'][category]:
            if m.get('key') == measurement_key:
                m['value_cm'] = new_value
                m['value'] = f"{new_value:.1f}"
                m['corrected'] = True
                m['confidence'] = 1.0  # User-provided = 100% confidence
    
    # Save updated result
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    return jsonify({'success': True, 'result': result})


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '2.0',
        'modules': {
            'processor': True,
            'morphology': processor.morphology_enabled if hasattr(processor, 'morphology_enabled') else False,
            'fashion': processor.fashion_enabled if hasattr(processor, 'fashion_enabled') else False
        }
    })


if __name__ == '__main__':
    logger.info("🚀 Starting 360° Precision AI Server v2.0")
    app.run(host='0.0.0.0', port=5000, debug=True)

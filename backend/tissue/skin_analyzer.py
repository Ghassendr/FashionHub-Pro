import os
import cv2
import numpy as np
import mediapipe as mp
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==========================================
# 1. FABRIC INVENTORY
# ==========================================
FABRIC_INVENTORY = [
    {"id": "TEX_001", "name": "Soie Bleu Nuit", "rgb": [25, 50, 120], "stock": 10, "price": 45, "texture": "Soie"},
    {"id": "TEX_002", "name": "Coton Blanc Pur", "rgb": [255, 255, 255], "stock": 25, "price": 15, "texture": "Coton"},
    {"id": "TEX_003", "name": "Lin Vert Émeraude", "rgb": [80, 200, 120], "stock": 8, "price": 30, "texture": "Lin"},
    {"id": "TEX_004", "name": "Velours Rouge Cramoisi", "rgb": [220, 20, 60], "stock": 12, "price": 55, "texture": "Velours"},
    {"id": "TEX_005", "name": "Cachemire Camel", "rgb": [193, 154, 107], "stock": 5, "price": 85, "texture": "Cachemire"},
    {"id": "TEX_006", "name": "Satin Jaune Citron", "rgb": [255, 244, 79], "stock": 10, "price": 40, "texture": "Satin"},
    {"id": "TEX_007", "name": "Denim Bleu Clair", "rgb": [135, 206, 235], "stock": 15, "price": 25, "texture": "Denim"},
    {"id": "TEX_008", "name": "Laine Gris Anthracite", "rgb": [47, 79, 79], "stock": 20, "price": 35, "texture": "Laine"},
    {"id": "TEX_009", "name": "Organza Rose Poudré", "rgb": [255, 192, 203], "stock": 7, "price": 50, "texture": "Organza"},
    {"id": "TEX_010", "name": "Tweed Marron Chocolat", "rgb": [123, 63, 0], "stock": 9, "price": 48, "texture": "Tweed"},
    {"id": "TEX_011", "name": "Soie Turquoise", "rgb": [64, 224, 208], "stock": 6, "price": 65, "texture": "Soie"},
    {"id": "TEX_012", "name": "Velours Bordeaux", "rgb": [128, 0, 32], "stock": 8, "price": 60, "texture": "Velours"},
    {"id": "TEX_013", "name": "Lin Beige Sable", "rgb": [194, 178, 128], "stock": 14, "price": 28, "texture": "Lin"},
    {"id": "TEX_014", "name": "Coton Lavande", "rgb": [230, 230, 250], "stock": 18, "price": 18, "texture": "Coton"},
    {"id": "TEX_015", "name": "Satin Fuchsia", "rgb": [255, 0, 255], "stock": 4, "price": 52, "texture": "Satin"},
]


# ==========================================
# 2. FABRIC MATCHING FUNCTION
# ==========================================
def find_matching_fabrics(recommended_colors, fabric_inventory, top_n=5):
    """
    Match recommended colors to available fabrics in inventory.
    
    Args:
        recommended_colors: List of dicts with 'rgb' key
        fabric_inventory: List of fabric dicts with 'rgb' key
        top_n: Number of top matches to return
    
    Returns:
        List of matched fabrics with similarity scores
    """
    if not recommended_colors:
        return []
    
    matches = []
    
    for fabric in fabric_inventory:
        fabric_rgb = np.array(fabric['rgb'])
        min_distance = float('inf')
        best_color_match = None
        
        # Find closest recommended color
        for color in recommended_colors:
            color_rgb = np.array(color['rgb'])
            distance = np.linalg.norm(fabric_rgb - color_rgb)
            
            if distance < min_distance:
                min_distance = distance
                best_color_match = color
        
        # Calculate similarity score (0-100)
        similarity = max(0, 100 - (min_distance / 4.41))  # 4.41 = sqrt(255^2 * 3) / 100
        
        matches.append({
            **fabric,
            'similarity': round(similarity, 1),
            'matched_color': best_color_match['name'] if best_color_match else None,
            'distance': round(min_distance, 2)
        })
    
    # Sort by similarity (highest first)
    matches.sort(key=lambda x: x['similarity'], reverse=True)
    
    return matches[:top_n]


# ==========================================
# 3. ADVANCED SKIN TONE ANALYZER
# ==========================================
class AccurateSkinAnalyzer:
    def __init__(self, json_path="skin_tone_colors_database.json"):
        logger.info("Initializing AccurateSkinAnalyzer...")
        
        try:
            if hasattr(mp, 'solutions'):
                self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=True, 
                    max_num_faces=1,
                    min_detection_confidence=0.5,
                    refine_landmarks=True
                )
                self.use_legacy = True
            else:
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision
                import urllib.request
                
                model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
                if not os.path.exists(model_path):
                    logger.info("Downloading face_landmarker.task...")
                    urllib.request.urlretrieve(
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", 
                        model_path
                    )
                
                base_options = mp_python.BaseOptions(model_asset_path=model_path)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    num_faces=1,
                    min_face_detection_confidence=0.5,
                    min_face_presence_confidence=0.5
                )
                self.face_mesh = vision.FaceLandmarker.create_from_options(options)
                self.use_legacy = False
            logger.info("MediaPipe Face Mesh initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Face Mesh: {e}")
            raise
        
        self.json_path = json_path
        self.database = self._load_database(json_path)
        self.json_path = json_path

    def _load_database(self, path):
        """Load skin tone database from JSON file."""
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    db_entries = len(data.get('skin_tone_database', {}))
                    logger.info(f"Database loaded: {db_entries} skin tone entries from {path}")
                    
                    if db_entries == 0:
                        logger.warning(f"Database is EMPTY at {path}")
                    
                    return data
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in database file {path}: {e}")
                return {"skin_tone_database": {}}
        else:
            logger.warning(f"Database file NOT FOUND at {path}")
            logger.warning("Creating minimal fallback database...")
            return self._create_fallback_database()
    
    def _create_fallback_database(self):
        """Create a minimal fallback database for testing."""
        fallback = {
            "skin_tone_database": {
                "fair_cool": {
                    "name": "Fair Cool",
                    "center_rgb": [255, 224, 210],
                    "undertone": "Cool",
                    "outfit_colors": {
                        "primary": {"name": "Navy Blue", "rgb": [0, 0, 128], "usage": "Suits, dresses"},
                        "secondary": {"name": "Emerald Green", "rgb": [80, 200, 120], "usage": "Accents"}
                    }
                },
                "medium_warm": {
                    "name": "Medium Warm",
                    "center_rgb": [210, 180, 140],
                    "undertone": "Warm",
                    "outfit_colors": {
                        "primary": {"name": "Olive Green", "rgb": [128, 128, 0], "usage": "Casual wear"},
                        "secondary": {"name": "Terracotta", "rgb": [204, 78, 92], "usage": "Accents"}
                    }
                },
                "deep_neutral": {
                    "name": "Deep Neutral",
                    "center_rgb": [140, 100, 80],
                    "undertone": "Neutral",
                    "outfit_colors": {
                        "primary": {"name": "Royal Blue", "rgb": [65, 105, 225], "usage": "Formal"},
                        "secondary": {"name": "Gold", "rgb": [255, 215, 0], "usage": "Accents"}
                    }
                }
            }
        }
        
        # Save fallback database
        try:
            with open(self.json_path, 'w', encoding='utf-8') as f:
                json.dump(fallback, f, indent=2, ensure_ascii=False)
            logger.info(f"Fallback database created and saved to {self.json_path}")
        except Exception as e:
            logger.error(f"Could not save fallback database: {e}")
        
        return fallback

    def _preprocess_image(self, img):
        """Enhance image quality for better face detection."""
        try:
            lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            logger.debug("Image preprocessing completed")
            return enhanced
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            return img

    def _extract_skin_color_advanced(self, img_rgb, landmarks):
        """Extract skin color from multiple facial zones."""
        h, w, _ = img_rgb.shape
        logger.debug(f"Extracting skin color from image of size {w}x{h}")
        
        zones = {
            'forehead': [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361],
            'left_cheek': [116, 123, 147, 213, 192, 234, 127, 162, 21, 54],
            'right_cheek': [345, 352, 376, 433, 416, 454, 356, 389, 251, 284],
            'nose_bridge': [6, 197, 195, 5, 4],
            'chin': [152, 148, 176, 149, 150, 136, 172, 138]
        }
        
        zone_colors = {}
        
        for zone_name, points in zones.items():
            colors = []
            for pid in points:
                if pid < len(landmarks.landmark):
                    lm = landmarks.landmark[pid]
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    y_start, y_end = max(0, cy - 20), min(h, cy + 20)
                    x_start, x_end = max(0, cx - 20), min(w, cx + 20)
                    sample = img_rgb[y_start:y_end, x_start:x_end]
                    if sample.size > 0:
                        colors.append(np.median(sample.reshape(-1, 3), axis=0))
            
            if colors:
                colors_array = np.array(colors)
                # Outlier removal using IQR
                q1 = np.percentile(colors_array, 25, axis=0)
                q3 = np.percentile(colors_array, 75, axis=0)
                iqr = q3 - q1
                mask = np.all((colors_array >= q1 - 1.5 * iqr) & (colors_array <= q3 + 1.5 * iqr), axis=1)
                filtered_colors = colors_array[mask]
                if len(filtered_colors) > 0:
                    zone_colors[zone_name] = np.median(filtered_colors, axis=0)
                    logger.debug(f"Zone '{zone_name}': extracted {len(filtered_colors)} valid color samples")
        
        if not zone_colors:
            logger.warning("No valid skin color zones detected")
            return None
        
        # Weighted average of zones
        weights = {'forehead': 0.3, 'left_cheek': 0.25, 'right_cheek': 0.25, 'nose_bridge': 0.1, 'chin': 0.1}
        weighted_color = np.zeros(3)
        total_weight = 0
        
        for zone, color in zone_colors.items():
            wgt = weights.get(zone, 0.1)
            weighted_color += color * wgt
            total_weight += wgt
        
        final_color = weighted_color / total_weight
        logger.info(f"Extracted skin color RGB: {final_color}")
        return final_color

    def _calculate_undertone(self, rgb):
        """Calculate skin undertone from RGB values."""
        r, g, b = rgb
        rgb_norm = np.array([[[r, g, b]]], dtype=np.uint8)
        lab = cv2.cvtColor(rgb_norm, cv2.COLOR_RGB2LAB)[0][0]
        a_val = lab[1] - 128
        b_val = lab[2] - 128
        
        score = 0
        score += 1 if r > g else -1
        score += 2 if b_val > 5 else -2 if b_val < -5 else 0
        score += 1 if a_val > 0 else -1
        
        if score > 1:
            undertone = "Warm"
        elif score < -1:
            undertone = "Cool"
        else:
            undertone = "Neutral"
        
        logger.debug(f"Undertone calculated: {undertone} (score: {score})")
        return (undertone, abs(score))

    def _find_best_match(self, detected_rgb, detected_undertone):
        """Find best matching skin tone in database."""
        db = self.database.get('skin_tone_database', {})
        
        if not db:
            logger.error("Database is empty - cannot find match")
            return None, float('inf')
        
        best_key, min_score = None, float('inf')
        
        for key, info in db.items():
            center_rgb = np.array(info['center_rgb'])
            db_undertone = info['undertone']
            
            # RGB distance
            rgb_dist = np.linalg.norm(detected_rgb - center_rgb)
            
            # LAB distance (perceptually more accurate)
            detected_lab = cv2.cvtColor(np.array([[detected_rgb]], dtype=np.uint8), cv2.COLOR_RGB2LAB)[0][0]
            center_lab = cv2.cvtColor(np.array([[center_rgb]], dtype=np.uint8), cv2.COLOR_RGB2LAB)[0][0]
            lab_dist = np.linalg.norm(detected_lab.astype(float) - center_lab.astype(float))
            
            # Undertone bonus
            bonus = -30 if detected_undertone.lower() in db_undertone.lower() else -10 if "neutral" in db_undertone.lower() else 0
            
            score = 0.4 * rgb_dist + 0.6 * lab_dist + bonus
            
            logger.debug(f"Match '{key}': RGB dist={rgb_dist:.2f}, LAB dist={lab_dist:.2f}, bonus={bonus}, score={score:.2f}")
            
            if score < min_score:
                min_score, best_key = score, key
        
        logger.info(f"Best match: '{best_key}' with score {min_score:.2f}")
        return best_key, min_score

    def analyze(self, image_path_or_array):
        """
        Analyze skin tone from image.
        
        Args:
            image_path_or_array: Path to image file or numpy array
        
        Returns:
            Dictionary with analysis results or None if failed
        """
        logger.info("=" * 60)
        logger.info("Starting skin tone analysis...")
        
        # Load image
        if isinstance(image_path_or_array, str):
            if not os.path.exists(image_path_or_array):
                logger.error(f"Image file not found: {image_path_or_array}")
                return None
            img = cv2.imread(image_path_or_array)
            logger.info(f"Loaded image from: {image_path_or_array}")
        else:
            img = image_path_or_array
            logger.info("Processing image from array")
        
        if img is None:
            logger.error("Failed to load image")
            return None
        
        logger.info(f"Image dimensions: {img.shape}")
        
        # Convert to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Enhance image
        img_enhanced = self._preprocess_image(img_rgb)
        
        # Detect face
        logger.info("Running face detection...")
        
        if self.use_legacy:
            results = self.face_mesh.process(img_enhanced)
            if not results.multi_face_landmarks:
                results_landmarks = None
            else:
                results_landmarks = results.multi_face_landmarks[0]
        else:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_enhanced)
            results = self.face_mesh.detect(mp_image)
            if not getattr(results, 'face_landmarks', None):
                results_landmarks = None
            else:
                class MockLandmarks:
                    def __init__(self, t_lms):
                        self.landmark = t_lms
                results_landmarks = MockLandmarks(results.face_landmarks[0])
        
        if not results_landmarks:
            logger.error("❌ No face detected in image")
            logger.error("Suggestions:")
            logger.error("  - Ensure face is clearly visible and well-lit")
            logger.error("  - Face should be front-facing")
            logger.error("  - Remove obstructions (sunglasses, masks, hair)")
            logger.error("  - Check image quality and resolution")
            return None
        
        logger.info(f"✓ Face detected with {len(results_landmarks.landmark)} landmarks")
        
        # Extract skin color
        detected_rgb = self._extract_skin_color_advanced(img_enhanced, results_landmarks)
        
        if detected_rgb is None:
            logger.error("❌ Could not extract skin color from detected face")
            return None
        
        logger.info(f"✓ Detected RGB: [{detected_rgb[0]:.1f}, {detected_rgb[1]:.1f}, {detected_rgb[2]:.1f}]")
        
        # Calculate undertone
        undertone, confidence = self._calculate_undertone(detected_rgb)
        logger.info(f"✓ Undertone: {undertone} (confidence: {confidence})")
        
        # Find best match
        best_key, distance = self._find_best_match(detected_rgb, undertone)
        
        if not best_key:
            logger.error("❌ No matching skin tone found in database")
            return None
        
        # Build result
        tone_info = self.database['skin_tone_database'][best_key]
        
        colors = []
        for cat, details in tone_info.get('outfit_colors', {}).items():
            if cat != 'avoid_colors' and isinstance(details, dict) and 'rgb' in details:
                colors.append({
                    "name": details['name'],
                    "rgb": details['rgb'],
                    "usage": details.get('usage', '')
                })
        
        accuracy = max(0, min(100, 100 - distance))
        
        result = {
            "detected_rgb": detected_rgb.tolist(),
            "name": tone_info['name'],
            "undertone": undertone,
            "undertone_confidence": confidence,
            "colors": colors,
            "distance": float(round(distance, 2)),
            "accuracy": float(round(accuracy, 1))
        }
        
        logger.info(f"✓ Analysis complete: {tone_info['name']} ({accuracy:.1f}% accuracy)")
        logger.info("=" * 60)
        
        return result
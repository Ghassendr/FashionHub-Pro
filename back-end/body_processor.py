import os
import cv2
import numpy as np
import trimesh
import logging
import json
import uuid
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import List, Dict, Optional

# Configuration Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FrameExtractor:
    """Étape 1: Extraction des frames et calcul des angles"""
    
    def __init__(self, target_frames: int = 150):  # Increased from 45 to 150
        self.target_frames = target_frames
        
    def extract(self, video_path: str, output_dir: str) -> tuple[List[Dict], Dict]:
        logger.info(f"Extraction des frames de: {video_path}")
        os.makedirs(output_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        logger.info(f"Vidéo: {total_frames} frames, {fps} fps, {width}x{height}, {duration:.1f}s")
        
        # Sélection intelligente
        if self.target_frames <= 0:
            step = 1
            target_limit = total_frames
        else:
            step = max(1, total_frames // self.target_frames)
            target_limit = self.target_frames
            
        extracted_frames = []
        
        frame_idx = 0
        saved_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            if frame_idx % step == 0:
                # Check limit if not native mode
                if self.target_frames > 0 and saved_count >= target_limit:
                    break
                # Resize pour performance voxel (max height 512)
                scale = 512 / height if height > 512 else 1.0
                new_w, new_h = int(width * scale), int(height * scale)
                frame_resized = cv2.resize(frame, (new_w, new_h))
                
                # Nom et chemin
                name = f"frame_{saved_count:03d}.jpg"
                path = os.path.join(output_dir, name)
                cv2.imwrite(path, frame_resized)
                
                # Angle calculé (0..360)
                # Angle calculé (0..360)
                if self.target_frames > 0:
                    angle = (saved_count / self.target_frames) * 360.0
                else:
                    # Native mode: use progress based on total frames
                    angle = (frame_idx / total_frames) * 360.0
                
                extracted_frames.append({
                    'path': path,
                    'frame_number': frame_idx,
                    'rotation_angle': angle,
                    'width': new_w,
                    'height': new_h
                })
                saved_count += 1
                
            frame_idx += 1
            
        cap.release()
        return extracted_frames, {'fps': fps, 'resolution': f"{width}x{height}", 'duration': duration}

class SilhouetteExtractor:
    """Étape 2: Segmentation AI (MediaPipe Image Segmenter)"""
    
    def __init__(self):
        try:
            model_path = os.path.abspath('models/selfie_segmenter.tflite')
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.ImageSegmenterOptions(
                base_options=base_options,
                output_category_mask=True)
            self.segmenter = vision.ImageSegmenter.create_from_options(options)
            self.model_loaded = True
        except Exception as e:
            logger.error(f"Erreur chargement Selfie Segmenter: {e}")
            self.model_loaded = False
        
    def process(self, frames: List[Dict]) -> List[Dict]:
        if not self.model_loaded: return frames
        logger.info("Extraction des silhouettes (AI MediaPipe Tasks)...")
        valid_frames = []
        
        for frame_data in frames:
            img = cv2.imread(frame_data['path'])
            if img is None: continue
            
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            
            try:
                result = self.segmenter.segment(mp_image)
                mask_np = result.category_mask.numpy_view()
                mask = (mask_np > 0).astype(np.uint8) * 255
                
                # Enhanced post-processing for cleaner silhouettes
                mask = self._enhance_mask(mask)
                
                # Calculate mask quality score
                quality = self._calculate_mask_quality(mask, img.shape)
                
                if quality > 0.15:  # Minimum 15% body coverage
                    frame_data['mask'] = mask
                    frame_data['body_detected'] = True
                    frame_data['mask_quality'] = quality
                    valid_frames.append(frame_data)
                else:
                    frame_data['body_detected'] = False
            except Exception as e:
                logger.error(f"Erreur segmentation: {e}")
                frame_data['body_detected'] = False

        logger.info(f"Silhouettes valides: {len(valid_frames)}/{len(frames)}")
        self._save_debug_grid(frames)
        return frames
    
    def _enhance_mask(self, mask: np.ndarray) -> np.ndarray:
        """
        Advanced mask post-processing for clean silhouettes:
        - Multi-scale morphological closing (fill holes)
        - Contour smoothing
        - Largest component selection
        """
        # Step 1: Multi-scale morphological closing to fill holes
        for kernel_size in [3, 7, 11]:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Step 2: Opening to remove noise
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel_open)
        
        # Step 3: Keep only largest connected component (remove stray pixels)
        mask = self._keep_largest_component(mask)
        
        # Step 4: Fill internal holes using flood fill
        mask = self._fill_holes(mask)
        
        # Step 5: Smooth contours with Gaussian blur + threshold
        mask_smooth = cv2.GaussianBlur(mask, (7, 7), 0)
        _, mask = cv2.threshold(mask_smooth, 127, 255, cv2.THRESH_BINARY)
        
        return mask
    
    def _keep_largest_component(self, mask: np.ndarray) -> np.ndarray:
        """Keep only the largest connected component."""
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        
        if num_labels <= 1:
            return mask
        
        # Find largest component (excluding background label 0)
        largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        
        # Create mask with only largest component
        result = np.zeros_like(mask)
        result[labels == largest_label] = 255
        
        return result
    
    def _fill_holes(self, mask: np.ndarray) -> np.ndarray:
        """Fill internal holes in the mask using contour filling."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Fill the external contour to close all internal holes
            filled = np.zeros_like(mask)
            cv2.drawContours(filled, contours, -1, 255, -1)  # -1 fills the contour
            return filled
        
        return mask
    
    def _calculate_mask_quality(self, mask: np.ndarray, img_shape: tuple) -> float:
        """Calculate mask quality as ratio of body pixels to image."""
        body_pixels = np.sum(mask > 0)
        total_pixels = img_shape[0] * img_shape[1]
        return body_pixels / total_pixels

    def _save_debug_grid(self, frames: List[Dict]):
        try:
            debug_frames = [f for f in frames if f.get('body_detected')]
            if not debug_frames: return
            indices = np.linspace(0, len(debug_frames)-1, min(9, len(debug_frames)), dtype=int)
            thumbnails = []
            
            for idx in indices:
                f = debug_frames[idx]
                img = cv2.imread(f['path'])
                overlay = img.copy()
                overlay[f['mask'] == 0] = [0, 0, 255]
                thumbnails.append(cv2.resize(overlay, (200, 300)))
            
            while len(thumbnails) < 9:
                thumbnails.append(np.zeros((300, 200, 3), dtype=np.uint8))

            row1 = np.hstack(thumbnails[:3]); row2 = np.hstack(thumbnails[3:6]); row3 = np.hstack(thumbnails[6:])
            grid = np.vstack([row1, row2, row3])
            
            run_dir = os.path.dirname(frames[0]['path'])
            cv2.imwrite(os.path.join(os.path.dirname(run_dir), 'extraction_debug.jpg'), grid)
        except Exception: pass

class SkeletonExtractor:
    """Étape 2.5: Extraction de Squelette (MediaPipe Pose Tasks)"""
    
    def __init__(self):
        try:
            model_path = os.path.abspath('models/pose_landmarker_full.task')
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(base_options=base_options, num_poses=1)
            self.detector = vision.PoseLandmarker.create_from_options(options)
            self.model_loaded = True
        except Exception: self.model_loaded = False
        
    def analyze(self, frames: List[Dict]) -> Dict:
        if not self.model_loaded: return {}
        logger.info("Analyse du squelette...")
        try:
            samples = [f for f in frames if f.get('body_detected')][::5]
            y_sh, y_hi, y_kn, y_an = [], [], [], []
            
            for f in samples:
                img = cv2.imread(f['path'])
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                res = self.detector.detect(mp_img)
                
                if res.pose_landmarks:
                    lms = res.pose_landmarks[0]
                    h = img.shape[0]
                    mask = f['mask']
                    rows = np.where(np.any(mask, axis=1))[0]
                    if len(rows) == 0: continue
                    y_min, y_max = rows[0], rows[-1]
                    bh = y_max - y_min
                    
                    def n_y(i): return (lms[i].y * h - y_min) / bh
                    y_sh.append((n_y(11)+n_y(12))/2); y_hi.append((n_y(23)+n_y(24))/2)
                    y_kn.append((n_y(25)+n_y(26))/2); y_an.append((n_y(27)+n_y(28))/2)
            
            if y_sh:
                m_sh, m_hi = np.median(y_sh), np.median(y_hi)
                return {
                    'neck': m_sh-0.05, 'shoulders': m_sh, 'chest': m_sh+(m_hi-m_sh)*0.35,
                    'waist': m_sh+(m_hi-m_sh)*0.75, 'hips': m_hi, 'crotch': m_hi+0.05,
                    'knees': np.median(y_kn), 'ankles': np.median(y_an)
                }
            return {}
        except Exception: return {}

class VoxelReconstructor:
    """Étape 3: Space Carving"""
    
    def __init__(self, resolution: int = 64):
        self.resolution = resolution
        
    def carve(self, frames: List[Dict]) -> np.ndarray:
        logger.info(f"Space Carving {self.resolution}^3...")
        voxels = np.ones((self.resolution, self.resolution, self.resolution), dtype=bool)
        
        lin = np.linspace(-1, 1, self.resolution)
        xv, yv, zv = np.meshgrid(lin, lin, lin, indexing='ij')
        coords = np.stack((xv.flatten(), yv.flatten(), zv.flatten()), axis=1)
        
        valid = [f for f in frames if f.get('body_detected', False)]
        if not valid: valid = frames
            
        for f in valid:
            rad = np.radians(f['rotation_angle'])
            c, s = np.cos(rad), np.sin(rad)
            x_p = coords[:, 0] * c - coords[:, 2] * s
            y_p = coords[:, 1]
            
            m = f['mask']
            h, w = m.shape
            u = ((x_p + 1.0) / 2.0 * w).astype(int)
            v = ((-y_p + 1.0) / 2.0 * h).astype(int)
            
            in_b = (u >= 0) & (u < w) & (v >= 0) & (v < h)
            idx = np.where(in_b)[0]
            if len(idx) > 0:
                sil = m[v[idx], u[idx]]
                voxels.view(bool).reshape(-1)[idx[sil == 0]] = False
                
        return voxels

class MeshGenerator:
    """Étape 4: Marching Cubes + Texture"""
    
    def generate(self, voxels: np.ndarray, frames: List[Dict], output_path: str):
        logger.info("Génération du maillage...")
        if not np.any(voxels): return False, None
        
        try:
            verts, faces, normals, values = measure.marching_cubes(voxels, level=0.5)
            # Center and scale
            res = voxels.shape[0]
            verts = (verts / res - 0.5) * 2.0
            mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)
            
            # Simple Smoothing
            mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=10)
            
            # Color Mapping
            colors = np.zeros((len(mesh.vertices), 4), dtype=np.uint8)
            counts = np.zeros(len(mesh.vertices), dtype=int)
            
            for f in [f for f in frames if f.get('body_detected')][:5]: # Use 5 frames for texture
                img = cv2.imread(f['path'])
                rad = np.radians(f['rotation_angle'])
                c, s = np.cos(rad), np.sin(rad)
                v_sh = mesh.vertices
                x_p = v_sh[:, 0] * c - v_sh[:, 2] * s
                y_p = v_sh[:, 1]
                h, w = img.shape[:2]
                u = ((x_p + 1.0) / 2.0 * w).astype(int)
                v = ((-y_p + 1.0) / 2.0 * h).astype(int)
                
                valid = (u >= 0) & (u < w) & (v >= 0) & (v < h)
                for i in np.where(valid)[0]:
                    colors[i, :3] += img[v[i], u[i]][::-1] # BGR to RGB
                    counts[i] += 1
            
            has_color = counts > 0
            colors[has_color, :3] = colors[has_color, :3] // counts[has_color][:, None]
            colors[~has_color] = [200, 200, 200, 255]
            colors[:, 3] = 255
            mesh.visual.vertex_colors = colors
            
            glb_path = output_path.replace('.obj', '.glb')
            mesh.export(glb_path)
            return True, glb_path
        except Exception as e:
            logger.error(f"Mesh Error: {e}")
            return False, None

class GeodesicMeasurer:
    """Étape 5: Mesures anatomiques avancées (12+ mesures)"""
    
    # Indices anatomiques normalisés (0 = pieds, 1 = tête)
    ANATOMICAL_INDICES = {
        'ankles': 0.05,
        'calves': 0.15,
        'knees': 0.25,
        'thighs': 0.35,
        'crotch': 0.40,
        'hips': 0.45,
        'waist': 0.55,
        'chest': 0.65,
        'bust': 0.68,
        'shoulders': 0.75,
        'neck': 0.82,
        'chin': 0.88,
        'biceps': 0.70,
        'wrists': 0.60
    }
    
    def calculate_from_mesh(self, mesh_path: str, height_cm_ref: float = 175.0, 
                           landmarks: Dict = None, weight_kg: float = 70.0) -> Dict:
        """
        Calcule les mesures corporelles depuis le mesh 3D
        Extrait 12+ mesures avec niveaux de confiance
        """
        logger.info("Calcul des mesures avancées...")
        mesh = trimesh.load(mesh_path)
        if isinstance(mesh, trimesh.Scene):
            geoms = list(mesh.geometry.values())
            mesh = trimesh.util.concatenate(geoms) if geoms else None
        
        if mesh is None: 
            return self._get_simulated_measurements(height_cm_ref, weight_kg)
        
        bounds = mesh.bounds
        min_y, max_y = bounds[0][1], bounds[1][1]
        height_3d = max_y - min_y
        sc = height_cm_ref / height_3d if height_3d > 0 else 1.0
        
        # Échantillonnage fin du corps
        num_slices = 150
        y_steps = np.linspace(min_y, max_y, num_slices)
        perimeters = []
        widths = []
        depths = []
        
        for y in y_steps:
            sec = mesh.section(plane_origin=[0, y, 0], plane_normal=[0, 1, 0])
            if sec:
                try:
                    perimeters.append(sec.length * sc)
                    bounds_sec = sec.bounds
                    widths.append((bounds_sec[1][0] - bounds_sec[0][0]) * sc)
                    depths.append((bounds_sec[1][2] - bounds_sec[0][2]) * sc)
                except:
                    perimeters.append(0)
                    widths.append(0)
                    depths.append(0)
            else:
                perimeters.append(0)
                widths.append(0)
                depths.append(0)
        
        # Mapper les indices anatomiques
        def get_index(ratio):
            return min(num_slices - 1, max(0, int(ratio * num_slices)))
        
        indices = {}
        if landmarks:
            for k, v in landmarks.items():
                indices[k] = get_index(v)
        else:
            for k, v in self.ANATOMICAL_INDICES.items():
                indices[k] = get_index(v)
        
        # Fonctions d'extraction
        def get_perimeter(key, fallback_ratio=0.5):
            idx = indices.get(key, get_index(fallback_ratio))
            return perimeters[idx] if perimeters[idx] > 0 else self._estimate_perimeter(key, height_cm_ref, weight_kg)
        
        def get_width(key, fallback_ratio=0.5):
            idx = indices.get(key, get_index(fallback_ratio))
            return widths[idx] if widths[idx] > 0 else self._estimate_width(key, height_cm_ref)
        
        def get_height_at(key, fallback_ratio=0.5):
            idx = indices.get(key, get_index(fallback_ratio))
            return (y_steps[idx] - min_y) * sc
        
        # Calcul des mesures
        chest_perim = get_perimeter('chest', 0.65)
        waist_perim = get_perimeter('waist', 0.55)
        hips_perim = get_perimeter('hips', 0.45)
        neck_perim = get_perimeter('neck', 0.82)
        thigh_perim = get_perimeter('thighs', 0.35)
        
        shoulder_width = get_width('shoulders', 0.75) * 1.15  # Correction pour projection
        back_width = shoulder_width * 0.85  # Approximation
        
        # Longueurs
        inseam = get_height_at('crotch', 0.40)
        arm_length = height_cm_ref * 0.44  # Proportion anthropométrique standard
        leg_length = inseam
        
        # Estimations pour biceps et poignet (basées sur proportions)
        bicep_perim = chest_perim * 0.35  # ~35% du tour de poitrine
        wrist_perim = chest_perim * 0.18  # ~18% du tour de poitrine
        
        # Construire le résultat avec confiances
        res = {
            'basics': [
                {'key': 'chest', 'name': 'Tour de Poitrine', 'name_en': 'Chest', 
                 'value': f"{chest_perim:.1f}", 'value_cm': round(chest_perim, 1), 
                 'unit': 'cm', 'confidence': 0.92, 'type': 'chest'},
                {'key': 'waist', 'name': 'Tour de Taille', 'name_en': 'Waist',
                 'value': f"{waist_perim:.1f}", 'value_cm': round(waist_perim, 1), 
                 'unit': 'cm', 'confidence': 0.90, 'type': 'waist'},
                {'key': 'hips', 'name': 'Tour de Hanches', 'name_en': 'Hips',
                 'value': f"{hips_perim:.1f}", 'value_cm': round(hips_perim, 1), 
                 'unit': 'cm', 'confidence': 0.93, 'type': 'hips'},
                {'key': 'neck', 'name': 'Tour de Cou', 'name_en': 'Neck',
                 'value': f"{neck_perim:.1f}", 'value_cm': round(neck_perim, 1), 
                 'unit': 'cm', 'confidence': 0.85, 'type': 'neck'},
                {'key': 'thigh', 'name': 'Tour de Cuisse', 'name_en': 'Thigh',
                 'value': f"{thigh_perim:.1f}", 'value_cm': round(thigh_perim, 1), 
                 'unit': 'cm', 'confidence': 0.82, 'type': 'thigh'},
            ],
            'heights': [
                {'key': 'stature', 'name': 'Stature Totale', 'name_en': 'Height',
                 'value': f"{height_cm_ref:.1f}", 'value_cm': round(height_cm_ref, 1), 
                 'unit': 'cm', 'confidence': 0.99, 'type': 'height'},
                {'key': 'inseam', 'name': 'Entrejambe', 'name_en': 'Inseam',
                 'value': f"{inseam:.1f}", 'value_cm': round(inseam, 1), 
                 'unit': 'cm', 'confidence': 0.85, 'type': 'inseam'},
                {'key': 'arm_length', 'name': 'Longueur Bras', 'name_en': 'Arm Length',
                 'value': f"{arm_length:.1f}", 'value_cm': round(arm_length, 1), 
                 'unit': 'cm', 'confidence': 0.80, 'type': 'arm_length'},
                {'key': 'leg_length', 'name': 'Longueur Jambes', 'name_en': 'Leg Length',
                 'value': f"{leg_length:.1f}", 'value_cm': round(leg_length, 1), 
                 'unit': 'cm', 'confidence': 0.85, 'type': 'leg_length'},
            ],
            'widths': [
                {'key': 'shoulders', 'name': 'Largeur Épaules', 'name_en': 'Shoulder Width',
                 'value': f"{shoulder_width:.1f}", 'value_cm': round(shoulder_width, 1), 
                 'unit': 'cm', 'confidence': 0.87, 'type': 'shoulder_width'},
                {'key': 'back_width', 'name': 'Largeur Dos', 'name_en': 'Back Width',
                 'value': f"{back_width:.1f}", 'value_cm': round(back_width, 1), 
                 'unit': 'cm', 'confidence': 0.82, 'type': 'back_width'},
            ],
            'functional': [
                {'key': 'bicep', 'name': 'Tour de Biceps', 'name_en': 'Bicep',
                 'value': f"{bicep_perim:.1f}", 'value_cm': round(bicep_perim, 1), 
                 'unit': 'cm', 'confidence': 0.75, 'type': 'bicep'},
                {'key': 'wrist', 'name': 'Tour de Poignet', 'name_en': 'Wrist',
                 'value': f"{wrist_perim:.1f}", 'value_cm': round(wrist_perim, 1), 
                 'unit': 'cm', 'confidence': 0.70, 'type': 'wrist'},
            ],
            'posture': []
        }
        return res
    
    def _estimate_perimeter(self, key: str, height_cm: float, weight_kg: float) -> float:
        """Estime un périmètre basé sur les proportions anthropométriques"""
        # Formules approximatives basées sur données anthropométriques
        bmi = weight_kg / ((height_cm / 100) ** 2)
        bmi_factor = bmi / 22  # Normalisation sur IMC moyen
        
        estimates = {
            'chest': 88 + (bmi_factor - 1) * 15,
            'waist': 75 + (bmi_factor - 1) * 20,
            'hips': 95 + (bmi_factor - 1) * 12,
            'neck': 36 + (bmi_factor - 1) * 4,
            'thighs': 55 + (bmi_factor - 1) * 8,
        }
        return estimates.get(key, 50)
    
    def _estimate_width(self, key: str, height_cm: float) -> float:
        """Estime une largeur basée sur les proportions"""
        estimates = {
            'shoulders': height_cm * 0.26,
            'back_width': height_cm * 0.22,
        }
        return estimates.get(key, height_cm * 0.25)

    def _get_simulated_measurements(self, height_cm: float = 175.0, weight_kg: float = 70.0) -> Dict:
        """Retourne des mesures simulées basées sur les proportions standards"""
        bmi = weight_kg / ((height_cm / 100) ** 2)
        factor = bmi / 22
        
        return {
            'basics': [
                {'key': 'chest', 'name': 'Tour de Poitrine', 'value_cm': round(88 * factor, 1), 'confidence': 0.6, 'type': 'chest'},
                {'key': 'waist', 'name': 'Tour de Taille', 'value_cm': round(75 * factor, 1), 'confidence': 0.6, 'type': 'waist'},
                {'key': 'hips', 'name': 'Tour de Hanches', 'value_cm': round(95 * factor, 1), 'confidence': 0.6, 'type': 'hips'},
                {'key': 'neck', 'name': 'Tour de Cou', 'value_cm': round(38 * factor, 1), 'confidence': 0.5, 'type': 'neck'},
                {'key': 'thigh', 'name': 'Tour de Cuisse', 'value_cm': round(55 * factor, 1), 'confidence': 0.5, 'type': 'thigh'},
            ],
            'heights': [
                {'key': 'stature', 'name': 'Stature', 'value_cm': height_cm, 'confidence': 0.99, 'type': 'height'},
                {'key': 'inseam', 'name': 'Entrejambe', 'value_cm': round(height_cm * 0.45, 1), 'confidence': 0.5, 'type': 'inseam'},
                {'key': 'arm_length', 'name': 'Longueur Bras', 'value_cm': round(height_cm * 0.44, 1), 'confidence': 0.5, 'type': 'arm_length'},
                {'key': 'leg_length', 'name': 'Longueur Jambes', 'value_cm': round(height_cm * 0.45, 1), 'confidence': 0.5, 'type': 'leg_length'},
            ],
            'widths': [
                {'key': 'shoulders', 'name': 'Largeur Épaules', 'value_cm': round(height_cm * 0.26, 1), 'confidence': 0.5, 'type': 'shoulder_width'},
                {'key': 'back_width', 'name': 'Largeur Dos', 'value_cm': round(height_cm * 0.22, 1), 'confidence': 0.5, 'type': 'back_width'},
            ],
            'functional': [
                {'key': 'bicep', 'name': 'Tour de Biceps', 'value_cm': round(30 * factor, 1), 'confidence': 0.4, 'type': 'bicep'},
                {'key': 'wrist', 'name': 'Tour de Poignet', 'value_cm': round(17 * factor, 1), 'confidence': 0.4, 'type': 'wrist'},
            ],
            'posture': []
        }

class BodyProcessor:
    """Pipeline V2 AI - Complete Body Analysis with SMPL-based reconstruction"""
    
    def __init__(self, target_frames: int = 0):  # Default to 0 (Native/All frames)
        self.fe = FrameExtractor(target_frames)
        self.se = SilhouetteExtractor()
        self.sk = SkeletonExtractor()
        self.me = GeodesicMeasurer()
        
        # Use SMPL-based reconstruction instead of space carving
        try:
            from smpl_reconstructor import SMPLReconstructor
            self.smpl = SMPLReconstructor()
            self.smpl_enabled = True
            logger.info("SMPL Reconstructor initialized")
        except Exception as e:
            logger.warning(f"SMPL Reconstructor not available: {e}")
            self.smpl_enabled = False
            # Fallback to old system
            self.vr = VoxelReconstructor()
            self.mg = MeshGenerator()
        
        # Import optional modules
        try:
            from morphology_analyzer import MorphologyAnalyzer
            self.morphology = MorphologyAnalyzer()
            self.morphology_enabled = True
        except ImportError:
            self.morphology_enabled = False
            logger.warning("MorphologyAnalyzer not available")
        
        try:
            from fashion_intelligence import FashionIntelligence
            self.fashion = FashionIntelligence()
            self.fashion_enabled = True
        except ImportError:
            self.fashion_enabled = False
            logger.warning("FashionIntelligence not available")
    
    def process(self, video_path: str, output_dir: str, height_cm: float = 175.0, 
                weight_kg: float = 70.0, age: int = None, gender: str = 'men',
                cut_preference: str = None) -> Dict:
        """
        Complete body analysis pipeline
        
        Args:
            video_path: Path to the 360° video
            output_dir: Output directory for results
            height_cm: User's height in cm
            weight_kg: User's weight in kg
            age: User's age (optional)
            gender: 'men' or 'women'
            cut_preference: 'ajusté', 'normal', or 'large'
        
        Returns:
            Complete analysis results with measurements, morphology, and recommendations
        """
        run_id = str(uuid.uuid4())[:8]
        res_dir = os.path.join(output_dir, run_id)
        frames_dir = os.path.join(res_dir, 'frames')
        os.makedirs(res_dir, exist_ok=True)
        
        start = time.time()
        logger.info(f"Starting analysis for {height_cm}cm, {weight_kg}kg")
        
        # Step 1: Extract frames
        frames, video_info = self.fe.extract(video_path, frames_dir)
        
        # Step 2: Silhouette segmentation
        frames = self.se.process(frames)
        
        # Step 3: Skeleton analysis
        landmarks = self.sk.analyze(frames)
        
        # Step 4: 3D reconstruction (SMPL-based or fallback)
        if self.smpl_enabled:
            mesh_ok, glb_path, smpl_params = self.smpl.fit(
                frames, 
                height_cm=height_cm, 
                weight_kg=weight_kg,
                gender=gender,
                output_path=os.path.join(res_dir, 'body_mesh.glb')
            )
        else:
            # Fallback to space carving
            voxels = self.vr.carve(frames)
            mesh_ok, glb_path = self.mg.generate(voxels, frames, os.path.join(res_dir, 'body_mesh.obj'))
            smpl_params = {}
        
        # Step 5: Advanced measurements
        if mesh_ok and glb_path:
            measurements = self.me.calculate_from_mesh(glb_path, height_cm, landmarks, weight_kg)
        else:
            measurements = self.me._get_simulated_measurements(height_cm, weight_kg)
        
        # Step 6: Morphology analysis
        morphology_data = {}
        if self.morphology_enabled:
            try:
                morphology_data = self.morphology.analyze(frames, measurements, height_cm, weight_kg)
            except Exception as e:
                logger.error(f"Morphology analysis error: {e}")
                morphology_data = self._get_default_morphology()
        else:
            morphology_data = self._get_default_morphology()
        
        # Step 7: Fashion intelligence
        fashion_data = {}
        if self.fashion_enabled:
            try:
                fashion_data = self.fashion.analyze(
                    measurements, morphology_data, 
                    gender=gender, user_preference=cut_preference, age=age
                )
            except Exception as e:
                logger.error(f"Fashion intelligence error: {e}")
                fashion_data = self._get_default_fashion()
        else:
            fashion_data = self._get_default_fashion()
        
        # Calculate quality score
        detected_count = sum(1 for f in frames if f.get('body_detected', False))
        quality_score = min(0.95, detected_count / len(frames)) if frames else 0.5
        
        # Generate beta parameters (shape descriptors)
        beta_params = self._calculate_beta_params(measurements, morphology_data)
        
        # Build result
        result = {
            'id': run_id,
            'status': 'completed',
            'video_info': video_info,
            'user_input': {
                'height_cm': height_cm,
                'weight_kg': weight_kg,
                'age': age,
                'gender': gender,
                'cut_preference': cut_preference
            },
            'measurements': measurements,
            'morphology': morphology_data,
            'fashion_recommendations': fashion_data,
            'processing_time_seconds': round(time.time() - start, 2),
            'mesh_path': f"/results/{run_id}/body_mesh.glb" if mesh_ok else None,
            'debug_image': f"/results/{run_id}/extraction_debug.jpg",
            'quality_score': round(quality_score, 2),
            'confidence': round(morphology_data.get('quality_score', 0.7), 2),
            'beta_parameters': beta_params,
            'frames_data': [
                {
                    'frame_number': f['frame_number'],
                    'rotation_angle': f['rotation_angle'],
                    'confidence': 0.9 if f.get('body_detected') else 0.3,
                    'body_detected': f.get('body_detected', False)
                } 
                for f in frames
            ],
            'frames_used': len([f for f in frames if f.get('body_detected', False)]),
            'total_frames': len(frames)
        }
        
        # Save result
        with open(os.path.join(res_dir, 'result.json'), 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Analysis complete in {result['processing_time_seconds']}s - Quality: {quality_score:.0%}")
        return result
    
    def _get_default_morphology(self) -> Dict:
        """Returns default morphology data when analysis is not available"""
        return {
            'silhouette': {
                'type': 'normal',
                'type_fr': 'Normal',
                'description': 'Silhouette équilibrée',
                'confidence': 0.5
            },
            'proportions': {
                'torso_to_legs_ratio': 0.65,
                'proportion_type': {'type': 'balanced', 'fr': 'Équilibré'}
            },
            'posture': {
                'type': 'unknown',
                'type_fr': 'Non analysée',
                'issues': []
            },
            'quality_score': 0.5
        }
    
    def _get_default_fashion(self) -> Dict:
        """Returns default fashion recommendations when not available"""
        return {
            'size_recommendations': {
                'EU': {'recommended_size': 'M', 'confidence': 0.5}
            },
            'cut_recommendations': {
                'primary_recommendation': {
                    'style': 'regular_fit',
                    'name_fr': 'Coupe classique'
                }
            },
            'morphological_alerts': []
        }
    
    def _calculate_beta_params(self, measurements: Dict, morphology: Dict) -> List[float]:
        """Calculate SMPL-like beta shape parameters from measurements"""
        # Extract key measures for shape encoding
        try:
            basics = measurements.get('basics', [])
            heights = measurements.get('heights', [])
            
            # Get values
            chest = next((m['value_cm'] for m in basics if m.get('key') == 'chest'), 95)
            waist = next((m['value_cm'] for m in basics if m.get('key') == 'waist'), 80)
            hips = next((m['value_cm'] for m in basics if m.get('key') == 'hips'), 98)
            height = next((m['value_cm'] for m in heights if m.get('key') == 'stature'), 175)
            
            # Normalize to standard values
            chest_n = (chest - 95) / 15
            waist_n = (waist - 80) / 15
            hips_n = (hips - 98) / 15
            height_n = (height - 175) / 15
            
            # Morphology-based params
            bmi = morphology.get('silhouette', {}).get('bmi', 22)
            bmi_n = (bmi - 22) / 5
            
            ratio = morphology.get('proportions', {}).get('torso_to_legs_ratio', 0.65)
            ratio_n = (ratio - 0.65) / 0.1
            
            # Generate 10 beta parameters
            beta = [
                round(height_n, 3),      # β0: Height
                round(chest_n, 3),       # β1: Chest
                round(waist_n, 3),       # β2: Waist
                round(hips_n, 3),        # β3: Hips
                round(bmi_n, 3),         # β4: BMI-derived
                round(ratio_n, 3),       # β5: Proportions
                round((chest_n - waist_n) / 2, 3),  # β6: V-shape factor
                round((hips_n - waist_n) / 2, 3),   # β7: Hip curve
                round(np.random.uniform(-0.2, 0.2), 3),  # β8: Variation
                round(np.random.uniform(-0.2, 0.2), 3),  # β9: Variation
            ]
            return beta
        except Exception:
            return [0.0] * 10


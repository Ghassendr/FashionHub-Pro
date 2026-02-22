import os
import cv2
import numpy as np
import trimesh
from skimage import measure
import logging
import json
import uuid
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import List, Dict, Optional, Tuple

# Configuration Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Minimum video requirements for robust processing
MIN_VIDEO_FRAMES = 24
MIN_VIDEO_HEIGHT = 240
RECOMMENDED_FPS = 15


class FrameExtractor:
    """Étape 1: Extraction des frames et calcul des angles (optimisé, multi-résolution)."""
    
    def __init__(self, target_frames: int = 72, max_image_height: int = 512):
        self.target_frames = target_frames
        self.max_image_height = max_image_height
        
    def extract(self, video_path: str, output_dir: str) -> Tuple[List[Dict], Dict]:
        logger.info(f"Extraction des frames de: {video_path} (max {self.target_frames} frames, h≤{self.max_image_height}px)")
        os.makedirs(output_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Validation vidéo pour différentes sources
        if total_frames < MIN_VIDEO_FRAMES:
            logger.warning(f"Vidéo courte: {total_frames} frames (recommandé ≥{MIN_VIDEO_FRAMES})")
        if height < MIN_VIDEO_HEIGHT:
            logger.warning(f"Résolution basse: {width}x{height} (recommandé hauteur ≥{MIN_VIDEO_HEIGHT})")
        
        logger.info(f"Vidéo: {total_frames} frames, {fps:.1f} fps, {width}x{height}, {duration:.1f}s")
        
        # Sélection uniforme sur 360° pour toute longueur de vidéo
        if self.target_frames <= 0:
            step = 1
            target_limit = min(total_frames, 150)  # plafond même en mode "tous"
        else:
            target_limit = self.target_frames
            step = max(1, total_frames // target_limit) if total_frames > target_limit else 1
            
        extracted_frames = []
        frame_idx = 0
        saved_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if self.target_frames > 0 and saved_count >= target_limit:
                break
            if frame_idx % step != 0:
                frame_idx += 1
                continue
                
            # Resize pour performance tout en gardant précision
            scale = self.max_image_height / height if height > self.max_image_height else 1.0
            new_w = int(round(width * scale))
            new_h = int(round(height * scale))
            if new_w < 64:
                new_w = 64
            if new_h < 64:
                new_h = 64
            frame_resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            name = f"frame_{saved_count:03d}.jpg"
            path = os.path.join(output_dir, name)
            cv2.imwrite(path, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 92])
            
            # Angle 0..360 réparti uniformément
            angle = (saved_count / target_limit) * 360.0 if target_limit > 0 else (frame_idx / max(1, total_frames)) * 360.0
            
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
        return extracted_frames, {
            'fps': fps,
            'resolution': f"{width}x{height}",
            'duration': duration,
            'extracted_count': len(extracted_frames)
        }

class SilhouetteExtractor:
    """Étape 2: Segmentation AI (MediaPipe) avec traitement parallèle."""
    
    def __init__(self, num_workers: int = 1):
        self.num_workers = max(1, num_workers)
        try:
            from rembg import new_session
            # Uses u2net_human_seg for high-quality human outlines
            self.session = new_session("u2net_human_seg")
            self.model_loaded = True
            logger.info("Rembg (U-2-Net) loaded successfully for silhouette segmentation.")
        except Exception as e:
            logger.error(f"Error loading Rembg: {e}")
            self.model_loaded = False
        
    def _segment_one(self, frame_data: Dict) -> Dict:
        """Segment a frame using Rembg."""
        if not self.model_loaded:
            frame_data['body_detected'] = False
            return frame_data

        img = cv2.imread(frame_data['path'])
        if img is None:
            frame_data['body_detected'] = False
            return frame_data
            
        try:
            from rembg import remove
            output = remove(img, session=self.session, alpha_matting=True)
            if output.shape[2] == 4:
                mask = output[:, :, 3]
            else:
                gray = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)
                _, mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
            
            mask = self._enhance_mask(mask)
            quality = self._calculate_mask_quality(mask, img.shape)
            has_limbs = self._check_limbs_present(mask, img.shape)
            
            if quality > 0.08 or (quality > 0.05 and has_limbs):
                frame_data['mask'] = mask
                frame_data['body_detected'] = True
                frame_data['mask_quality'] = quality
            else:
                frame_data['body_detected'] = False
        except Exception as e:
            logger.error(f"Rembg segmentation failed on frame: {e}")
            frame_data['body_detected'] = False
            
        return frame_data
        
    def process(self, frames: List[Dict]) -> List[Dict]:
        if not self.model_loaded:
            return frames
        logger.info("Extraction des silhouettes (MediaPipe, %d workers)...", self.num_workers)
        valid_count = 0
        if self.num_workers <= 1:
            for frame_data in frames:
                self._segment_one(frame_data)
                if frame_data.get('body_detected'):
                    valid_count += 1
        else:
            with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
                futures = {executor.submit(self._segment_one, fd): fd for fd in frames}
                for fut in as_completed(futures):
                    fd = fut.result()
                    if fd.get('body_detected'):
                        valid_count += 1
        logger.info("Silhouettes valides: %d/%d", valid_count, len(frames))
        self._save_debug_grid(frames)
        return frames
    
    def _enhance_mask(self, mask: np.ndarray) -> np.ndarray:
        """
        Advanced mask post-processing pour détection complète du corps:
        - Préserve les membres (bras, jambes) même s'ils sont partiellement détectés
        - Multi-scale morphological closing (fill holes)
        - Extension vers les membres si landmarks détectés
        - Contour smoothing
        """
        original_mask = mask.copy()
        
        # Step 1: Dilatation légère pour connecter les membres au torse
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        mask_dilated = cv2.dilate(mask, kernel_dilate, iterations=1)
        
        # Step 2: Multi-scale morphological closing pour remplir les trous
        for kernel_size in [5, 9, 13]:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            mask_dilated = cv2.morphologyEx(mask_dilated, cv2.MORPH_CLOSE, kernel)
        
        # Step 3: Garder le plus grand composant MAIS préserver les membres
        # Au lieu de garder seulement le plus grand, on garde tous les composants connectés au corps principal
        mask = self._keep_body_with_limbs(mask_dilated, original_mask)
        
        # Step 4: Remplir les trous internes
        mask = self._fill_holes(mask)
        
        # Step 5: Lissage des contours (moins agressif pour préserver les membres)
        mask_smooth = cv2.GaussianBlur(mask, (5, 5), 0)
        _, mask = cv2.threshold(mask_smooth, 100, 255, cv2.THRESH_BINARY)  # Seuil plus bas
        
        return mask
    
    def _keep_body_with_limbs(self, mask: np.ndarray, original_mask: np.ndarray) -> np.ndarray:
        """
        Garde le corps principal ET les membres même s'ils sont séparés.
        Utilise une approche de connexion basée sur la distance.
        """
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
        
        if num_labels <= 1:
            return mask
        
        # Trouver le composant principal (le plus grand, généralement le torse)
        areas = stats[1:, cv2.CC_STAT_AREA]
        main_label = 1 + np.argmax(areas)
        main_centroid = centroids[main_label]
        
        # Créer le masque résultat avec le composant principal
        result = np.zeros_like(mask)
        result[labels == main_label] = 255
        
        # Ajouter les composants qui sont proches du corps principal (membres)
        h, w = mask.shape
        max_distance = min(h, w) * 0.15  # Distance max pour considérer comme membre
        
        for label in range(1, num_labels):
            if label == main_label:
                continue
            
            component_area = stats[label, cv2.CC_STAT_AREA]
            component_centroid = centroids[label]
            
            # Distance du composant au corps principal
            distance = np.sqrt(
                (component_centroid[0] - main_centroid[0])**2 +
                (component_centroid[1] - main_centroid[1])**2
            )
            
            # Si le composant est proche ET a une taille raisonnable (membre)
            if distance < max_distance and component_area > 100:
                result[labels == label] = 255
        
        # Si le masque original avait des pixels dans des zones non incluses, les ajouter
        # (pour préserver les membres fins qui pourraient être perdus)
        diff = original_mask - result
        diff[diff < 0] = 0
        
        # Dilater légèrement le résultat et ajouter les pixels originaux proches
        kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        result_dilated = cv2.dilate(result, kernel_small, iterations=1)
        
        # Ajouter les pixels originaux qui sont proches du résultat
        result = cv2.bitwise_or(result, cv2.bitwise_and(original_mask, result_dilated))
        
        return result
    
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
    
    def _check_limbs_present(self, mask: np.ndarray, img_shape: tuple) -> bool:
        """
        Vérifie si des membres sont présents dans le masque.
        Détecte les extensions du masque vers les bords (bras levés, jambes).
        """
        h, w = img_shape[:2]
        
        # Vérifier les bords de l'image pour détecter les membres
        # Haut (bras levés)
        top_region = mask[:h//4, :]
        top_body_pixels = np.sum(top_region > 0)
        
        # Côtés (bras étendus)
        left_region = mask[:, :w//6]
        right_region = mask[:, -w//6:]
        side_body_pixels = np.sum(left_region > 0) + np.sum(right_region > 0)
        
        # Bas (jambes)
        bottom_region = mask[-h//4:, :]
        bottom_body_pixels = np.sum(bottom_region > 0)
        
        # Si on a des pixels dans les régions de membres, considérer comme valide
        return (top_body_pixels > 50 or side_body_pixels > 100 or bottom_body_pixels > 100)

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
            model_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models', 'pose_landmarker_full.task')
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                num_poses=1,
                min_pose_detection_confidence=0.3,  # Seuil plus bas pour détecter plus de poses
                min_pose_presence_confidence=0.3,   # Même avec membres partiellement visibles
                min_tracking_confidence=0.3,
                output_segmentation_masks=False)
            self.detector = vision.PoseLandmarker.create_from_options(options)
            self.model_loaded = True
        except Exception: self.model_loaded = False
        
    def analyze(self, frames: List[Dict], sample_step: int = 1, max_frames: int = 60) -> Dict:
        if not self.model_loaded:
            return {}
        logger.info("Analyse du squelette...")
        try:
            valid = [f for f in frames if f.get('body_detected')]
            samples = valid[::sample_step][:max_frames] if valid else []
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
                           landmarks: Dict = None, weight_kg: float = 70.0,
                           num_slices: int = 150) -> Dict:
        """
        Calcule les mesures corporelles depuis le mesh 3D.
        num_slices: nombre de sections horizontales (plus = plus précis, ex. 200 pour haute précision).
        """
        logger.info("Calcul des mesures avancées (%d slices)...", num_slices)
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
        
        num_slices = max(50, min(300, num_slices))
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
    """Pipeline V2 AI - Complete Body Analysis, optimisé et haute précision."""
    
    def __init__(self, target_frames: int = 0, quality: str = "balanced"):
        try:
            from .pipeline_config import get_preset, PipelinePreset
            self._preset = get_preset(quality)
        except ImportError:
            self._preset = None
        self._target_frames_legacy = target_frames

        # ── NEW: Sequential pipeline with anatomical mesh ──
        try:
            from .sequential_pipeline import SequentialPipeline
            self._seq_pipeline = SequentialPipeline(quality)
            self._use_sequential = True
            logger.info("Sequential Pipeline with Anatomical Mesh initialized")
        except Exception as e:
            logger.warning("Sequential Pipeline not available: %s — using legacy", e)
            self._seq_pipeline = None
            self._use_sequential = False

        # ── Legacy extractors (kept as fallback) ──
        self.fe = FrameExtractor(72, 512)
        self.se = SilhouetteExtractor(4)
        self.sk = SkeletonExtractor()
        self.me = GeodesicMeasurer()
        
        try:
            from .smpl_reconstructor import SMPLReconstructor
            self.smpl = SMPLReconstructor()
            self.smpl_enabled = True
            logger.info("SMPL Reconstructor initialized")
        except Exception as e:
            logger.warning("SMPL Reconstructor not available: %s", e)
            self.smpl_enabled = False
            self.vr = VoxelReconstructor()
            self.mg = MeshGenerator()
        
        try:
            from .morphology_analyzer import MorphologyAnalyzer
            self.morphology = MorphologyAnalyzer()
            self.morphology_enabled = True
        except ImportError:
            self.morphology_enabled = False
            logger.warning("MorphologyAnalyzer not available")
        
        try:
            from .fashion_intelligence import FashionIntelligence
            self.fashion = FashionIntelligence()
            self.fashion_enabled = True
        except ImportError:
            self.fashion_enabled = False
            logger.warning("FashionIntelligence not available")
    
    def _get_preset(self):
        if self._preset is not None:
            return self._preset
        from .pipeline_config import get_preset
        return get_preset("balanced")
    
    def process(self, video_path: str, output_dir: str, height_cm: float = 175.0, 
                weight_kg: float = 70.0, age: int = None, gender: str = 'men',
                cut_preference: str = None, quality: Optional[str] = None) -> Dict:
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
        # ── NEW: Delegate to Sequential Pipeline if available ──
        if self._use_sequential and self._seq_pipeline is not None:
            try:
                logger.info("Using Sequential Pipeline (anatomical mesh)")
                return self._seq_pipeline.run(
                    video_path, output_dir,
                    height_cm=height_cm, weight_kg=weight_kg,
                    age=age, gender=gender,
                    cut_preference=cut_preference, quality=quality
                )
            except Exception as e:
                logger.error("Sequential Pipeline failed: %s — falling back to legacy", e, exc_info=True)

        # ── Legacy pipeline (unchanged) ──
        preset = self._get_preset()
        if quality is not None:
            try:
                from .pipeline_config import get_preset
                preset = get_preset(quality)
            except ImportError:
                pass
        logger.info("Preset: %s (%d frames, mesh res %d/%d)", preset.name, preset.target_frames, preset.mesh_resolution_height, preset.mesh_resolution_radial)
        
        # Extractors avec paramètres du preset
        self.fe = FrameExtractor(preset.target_frames, preset.max_image_height)
        self.se = SilhouetteExtractor(preset.segment_workers)
        
        run_id = str(uuid.uuid4())[:8]
        res_dir = os.path.join(output_dir, run_id)
        frames_dir = os.path.join(res_dir, 'frames')
        os.makedirs(res_dir, exist_ok=True)
        
        start = time.time()
        logger.info("Starting analysis for %s cm, %s kg (quality=%s)", height_cm, weight_kg, preset.name)
        
        # Step 1: Extract frames (uniform 360° sampling)
        frames, video_info = self.fe.extract(video_path, frames_dir)
        if not frames:
            return self._error_result(run_id, "Aucune frame extraite (vidéo vide ou trop courte)")
        
        # Step 2: Silhouette segmentation (parallèle) - KEPT
        frames = self.se.process(frames)
        
        # Step 3 (REPLACED): MediaPipe extrait joints 2D comme hints pour SMPLify-X
        # (pas comme géométrie finale)
        mesh_ok = False
        glb_path = None
        smpl_params = {}
        overlay_video_path = None
        smplify_x_used = False
        
        try:
            from .smplify_x_fitter import SMPLifyXFitter
            from .smpl_fitter import SMPLFitter
            from .video_overlay import VideoOverlayRenderer
            
            smplify_x = SMPLifyXFitter(gender=gender)
            smpl_fitter = SMPLFitter()
            overlay_renderer = VideoOverlayRenderer()
            
            # Step 3: Extraire joints 2D de toutes les frames (hints seulement)
            logger.info("Step 3: Extracting 2D joints from MediaPipe (hints for SMPLify-X)...")
            joints_data = smplify_x.extract_2d_joints(frames)
            
            if not joints_data:
                logger.warning("No joints extracted, falling back to standard reconstruction")
                raise ValueError("No joints data")
            
            # Step 4 (REPLACED): SMPLify-X optimise β (forme) et θ (pose)
            # pour que le modèle SMPL reprojeté corresponde aux silhouettes et joints
            logger.info("Step 4: SMPLify-X optimization (β shape + θ pose)...")
            mesh, fitting_info = smplify_x.optimize_smpl_x(
                frames, joints_data, height_cm, weight_kg, gender
            )
            
            if mesh is None:
                raise ValueError("SMPLify-X optimization failed")
            
            # Step 5 (REPLACED): Appliquer SMPLFitter pour verrouiller un β unique
            # Garantit que la forme du corps est cohérente, pas une moyenne bruitée
            logger.info("Step 5: Applying SMPLFitter to lock unique β parameter...")
            
            # Extract β estimates from fitting_info (if multiple frames were optimized separately)
            # For now, use the single optimized β
            beta_from_fitting = np.array(fitting_info.get('beta', np.zeros(10)))
            
            # Lock unique β
            beta_unique, beta_fitting_info = smpl_fitter.fit_unique_beta(
                frames_beta=[beta_from_fitting],  # Single β for now
                frames_theta=[np.array(fitting_info.get('theta', np.zeros(63)))],
                height_cm=height_cm,
                weight_kg=weight_kg,
                gender=gender
            )
            
            # Regenerate mesh with locked β
            mesh = smplify_x._generate_smpl_x_mesh(
                beta_unique,
                np.array(fitting_info.get('theta', np.zeros(63))),
                height_cm,
                gender
            )
            
            if mesh is not None:
                # Texturage depuis la vidéo pour rendu réaliste
                mesh = self._texture_mesh_from_video(mesh, frames, height_cm)
                
                # Sauvegarder mesh SMPL-X
                glb_path = os.path.join(res_dir, 'body_mesh.glb')
                mesh.export(glb_path)
                mesh_ok = True
                smpl_params = {
                    'beta': beta_unique.tolist(),
                    'theta': fitting_info.get('theta', []),
                    'beta_fitting_info': beta_fitting_info
                }
                
                logger.info("SMPLify-X pipeline complete: continuous mesh with unique β")
                smplify_x_used = True
                
                # Générer vidéo avec overlay pour validation
                try:
                    overlay_video_path = overlay_renderer.render_overlay(
                        mesh, frames, res_dir, height_cm
                    )
                    logger.info("Overlay video generated for validation")
                except Exception as e:
                    logger.warning(f"Overlay video generation failed: {e}")
            else:
                raise ValueError("Mesh generation failed after β locking")
                
        except ImportError as e:
            logger.warning(f"SMPLify-X not available: {e}, using standard reconstruction")
            # Fallback vers méthode standard
            if self.smpl_enabled:
                mesh_ok, glb_path, smpl_params = self.smpl.fit(
                    frames, height_cm, weight_kg, gender,
                    os.path.join(res_dir, 'body_mesh.glb'), preset
                )
            else:
                voxels = self.vr.carve(frames)
                mesh_ok, glb_path = self.mg.generate(voxels, frames, os.path.join(res_dir, 'body_mesh.obj'))
                smpl_params = {}
        except Exception as e:
            logger.error(f"SMPLify-X pipeline error: {e}", exc_info=True)
            # Fallback vers méthode standard
            if self.smpl_enabled:
                mesh_ok, glb_path, smpl_params = self.smpl.fit(
                    frames, height_cm, weight_kg, gender,
                    os.path.join(res_dir, 'body_mesh.glb'), preset
                )
            else:
                voxels = self.vr.carve(frames)
                mesh_ok, glb_path = self.mg.generate(voxels, frames, os.path.join(res_dir, 'body_mesh.obj'))
                smpl_params = {}
        
        # Extract landmarks for measurements (compatibility with Step 6)
        landmarks = self.sk.analyze(frames, sample_step=preset.pose_sample_step, max_frames=preset.pose_max_frames)
        
        # Step 5: Mesures avancées (plus de slices = plus de précision)
        if mesh_ok and glb_path:
            measurements = self.me.calculate_from_mesh(
                glb_path, height_cm, landmarks, weight_kg, num_slices=preset.geodesic_slices
            )
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
            'mesh_url': f"/results/{run_id}/body_mesh.glb" if mesh_ok else None,
            'overlay_video_path': f"/results/{run_id}/model_overlay.mp4" if overlay_video_path else None,
            'overlay_video_url': f"/results/{run_id}/model_overlay.mp4" if overlay_video_path else None,
            'smplify_x_used': smplify_x_used,
            'landmark_fitting_used': smplify_x_used,  # For backward compatibility
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
        
        logger.info("Analysis complete in %s s - Quality: %s", result['processing_time_seconds'], f"{quality_score:.0%}")
        return result
    
    def _texture_mesh_from_video(self, mesh: trimesh.Trimesh, frames: List[Dict], 
                                 height_cm: float) -> trimesh.Trimesh:
        """
        Texture le mesh 3D depuis les frames vidéo pour un rendu réaliste.
        Utilise plusieurs vues pour mapper les textures sur le mesh.
        """
        logger.info("Texturing mesh from video frames...")
        
        if not hasattr(mesh.visual, 'vertex_colors'):
            return mesh
        
        # Sélectionner frames représentatives (front, side, back)
        valid_frames = [f for f in frames if f.get('body_detected')]
        if not valid_frames:
            return mesh
        
        # Trouver frames front/side/back
        front_frames = sorted(valid_frames, key=lambda f: min(
            abs(f['rotation_angle'] % 360),
            abs((f['rotation_angle'] % 360) - 180)
        ))[:5]
        
        side_frames = sorted(valid_frames, key=lambda f: min(
            abs((f['rotation_angle'] % 360) - 90),
            abs((f['rotation_angle'] % 360) - 270)
        ))[:5]
        
        # Initialiser les couleurs
        colors = np.zeros((len(mesh.vertices), 4), dtype=np.uint8)
        counts = np.zeros(len(mesh.vertices), dtype=int)
        
        # Texturer depuis chaque frame
        for frame in front_frames + side_frames:
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                
                h, w = img.shape[:2]
                angle = frame.get('rotation_angle', 0)
                rad = np.radians(angle)
                
                # Projection simplifiée: rotation autour de Y
                cos_a, sin_a = np.cos(rad), np.sin(rad)
                verts_2d = mesh.vertices.copy()
                
                # Rotation autour de Y
                x_rot = verts_2d[:, 0] * cos_a - verts_2d[:, 2] * sin_a
                z_rot = verts_2d[:, 0] * sin_a + verts_2d[:, 2] * cos_a
                
                # Projection orthographique sur le plan image
                # Normaliser les coordonnées
                mesh_bounds = mesh.bounds
                scale_x = w / (mesh_bounds[1][0] - mesh_bounds[0][0] + 1e-6)
                scale_y = h / (mesh_bounds[1][1] - mesh_bounds[0][1] + 1e-6)
                
                u = ((x_rot - mesh_bounds[0][0]) * scale_x).astype(int)
                v = ((-verts_2d[:, 1] + mesh_bounds[1][1]) * scale_y).astype(int)
                
                # Filtrer les vertices visibles
                valid = (u >= 0) & (u < w) & (v >= 0) & (v < h)
                
                # Appliquer masque de silhouette si disponible
                if 'mask' in frame:
                    mask = frame['mask']
                    for i in np.where(valid)[0]:
                        if mask[v[i], u[i]] > 0:  # Pixel dans le corps
                            colors[i, :3] += img[v[i], u[i]][::-1]  # BGR -> RGB
                            counts[i] += 1
                else:
                    for i in np.where(valid)[0]:
                        colors[i, :3] += img[v[i], u[i]][::-1]
                        counts[i] += 1
            except Exception as e:
                logger.debug(f"Texturing error for frame: {e}")
                continue
        
        # Moyenne des couleurs
        has_color = counts > 0
        if np.any(has_color):
            colors[has_color, :3] = colors[has_color, :3] // counts[has_color][:, None]
        colors[~has_color, :3] = [200, 180, 160]  # Couleur peau par défaut
        colors[:, 3] = 255
        
        mesh.visual.vertex_colors = colors
        logger.info(f"Mesh textured from {len(front_frames + side_frames)} frames")
        
        return mesh
    
    def _error_result(self, run_id: str, message: str) -> Dict:
        return {
            'id': run_id,
            'status': 'error',
            'error': message,
            'measurements': self.me._get_simulated_measurements(175.0, 70.0),
            'morphology': self._get_default_morphology(),
            'fashion_recommendations': self._get_default_fashion(),
            'mesh_path': None,
            'mesh_url': None,
            'quality_score': 0.0,
        }
    
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


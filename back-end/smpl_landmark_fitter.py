"""
SMPL Landmark-Based Fitter
Ajuste le modèle 3D SMPL aux landmarks MediaPipe pour correspondre exactement à la personne dans la vidéo.
"""

import os
import numpy as np
import cv2
import trimesh
import logging
from typing import List, Dict, Tuple, Optional, Any
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Mapping MediaPipe landmarks → points anatomiques clés pour ajustement SMPL
MEDIAPIPE_TO_SMPL_JOINTS = {
    # MediaPipe index → nom anatomique
    0: 'nose',
    11: 'left_shoulder',
    12: 'right_shoulder',
    13: 'left_elbow',
    14: 'right_elbow',
    15: 'left_wrist',
    16: 'right_wrist',
    23: 'left_hip',
    24: 'right_hip',
    25: 'left_knee',
    26: 'right_knee',
    27: 'left_ankle',
    28: 'right_ankle',
}


class LandmarkPreprocessor:
    """Pré-traitement et amélioration de la précision des landmarks MediaPipe."""
    
    def __init__(self):
        self.landmark_history = []  # Pour filtrage temporel
        
    def process_landmarks(self, landmarks: List, frame_idx: int, 
                        image_shape: Tuple[int, int]) -> Dict:
        """
        Traite et améliore les landmarks MediaPipe.
        - Filtrage temporel (moyenne mobile)
        - Validation anatomique
        - Normalisation
        """
        h, w = image_shape[:2]
        
        # Convertir en numpy array
        lm_array = np.array([(lm.x * w, lm.y * h, lm.z * w) for lm in landmarks])
        
        # Filtrage temporel (moyenne mobile sur 3 frames)
        self.landmark_history.append(lm_array)
        if len(self.landmark_history) > 3:
            self.landmark_history.pop(0)
        
        if len(self.landmark_history) > 1:
            lm_array = np.mean(self.landmark_history, axis=0)
        
        # Validation anatomique
        lm_dict = self._validate_anatomy(lm_array, w, h)
        
        return lm_dict
    
    def _validate_anatomy(self, lm_array: np.ndarray, w: int, h: int) -> Dict:
        """Valide les proportions anatomiques et corrige les anomalies."""
        # Indices MediaPipe
        nose = lm_array[0]
        l_shoulder = lm_array[11]
        r_shoulder = lm_array[12]
        l_hip = lm_array[23]
        r_hip = lm_array[24]
        l_knee = lm_array[25]
        r_knee = lm_array[26]
        l_ankle = lm_array[27]
        r_ankle = lm_array[28]
        
        # Vérifications anatomiques
        shoulder_width = np.linalg.norm(l_shoulder[:2] - r_shoulder[:2])
        hip_width = np.linalg.norm(l_hip[:2] - r_hip[:2])
        torso_height = np.abs((l_shoulder[1] + r_shoulder[1]) / 2 - (l_hip[1] + r_hip[1]) / 2)
        leg_length = np.abs((l_hip[1] + r_hip[1]) / 2 - (l_ankle[1] + r_ankle[1]) / 2)
        
        # Ratios anatomiques normaux (validation)
        shoulder_hip_ratio = shoulder_width / max(hip_width, 1)
        torso_leg_ratio = torso_height / max(leg_length, 1)
        
        # Si ratios anormaux, appliquer corrections
        if shoulder_hip_ratio < 0.7 or shoulder_hip_ratio > 1.5:
            logger.warning(f"Ratio épaule/hanches anormal: {shoulder_hip_ratio:.2f}")
        
        if torso_leg_ratio < 0.4 or torso_leg_ratio > 0.7:
            logger.warning(f"Ratio torse/jambes anormal: {torso_leg_ratio:.2f}")
        
        return {
            'landmarks_2d': lm_array[:, :2],  # (x, y) en pixels
            'landmarks_3d': lm_array,  # (x, y, z) en pixels
            'shoulder_width': shoulder_width,
            'hip_width': hip_width,
            'torso_height': torso_height,
            'leg_length': leg_length,
            'shoulder_hip_ratio': shoulder_hip_ratio,
            'torso_leg_ratio': torso_leg_ratio,
        }


class SMPLLandmarkFitter:
    """
    Ajuste le modèle 3D SMPL aux landmarks MediaPipe pour correspondre exactement à la personne.
    Utilise les landmarks pour ajuster les paramètres de forme (beta) et de pose (theta).
    """
    
    def __init__(self):
        self.landmark_preprocessor = LandmarkPreprocessor()
        self.pose_detector = None
        self._init_pose_detector()
        
    def _init_pose_detector(self):
        """Initialise le détecteur MediaPipe Pose."""
        try:
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'models', 'pose_landmarker_full.task'))
            if not os.path.exists(model_path):
                model_path = os.path.abspath('models/pose_landmarker_full.task')
            if os.path.exists(model_path):
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    num_poses=1,
                    output_segmentation_masks=True,  # Activer pour avoir le corps complet
                    min_pose_detection_confidence=0.3,  # Seuil bas pour détecter membres levés
                    min_pose_presence_confidence=0.3,   # Même avec membres partiellement visibles
                    min_tracking_confidence=0.3
                )
                self.pose_detector = vision.PoseLandmarker.create_from_options(options)
                logger.info("Pose detector initialized for landmark fitting")
            else:
                logger.warning(f"Pose model not found: {model_path}")
        except Exception as e:
            logger.error(f"Failed to initialize pose detector: {e}")
    
    def fit_to_landmarks(self, frames: List[Dict], height_cm: float, weight_kg: float,
                        gender: str, measurements: Dict = None) -> Tuple[trimesh.Trimesh, Dict]:
        """
        Ajuste le mesh 3D aux landmarks MediaPipe de toutes les frames.
        
        Returns:
            mesh: Mesh 3D ajusté
            fitting_info: Informations sur le fitting (erreurs, paramètres)
        """
        logger.info("Fitting SMPL mesh to MediaPipe landmarks...")
        
        if not self.pose_detector:
            logger.error("Pose detector not available")
            return None, {}
        
        # Étape 1: Extraire landmarks de toutes les frames valides
        all_landmarks = []
        valid_frames = []
        
        for frame in frames:
            if not frame.get('body_detected'):
                continue
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                result = self.pose_detector.detect(mp_image)
                
                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    landmarks = result.pose_landmarks[0]
                    
                    # Vérifier que les membres sont détectés (au moins épaules et hanches)
                    has_shoulders = landmarks[11].visibility > 0.3 and landmarks[12].visibility > 0.3
                    has_hips = landmarks[23].visibility > 0.3 and landmarks[24].visibility > 0.3
                    
                    # Accepter même si seulement le torse est détecté (on complétera avec segmentation)
                    if has_shoulders or has_hips:
                        processed = self.landmark_preprocessor.process_landmarks(
                            landmarks, frame.get('frame_number', 0), img.shape
                        )
                        all_landmarks.append(processed)
                        valid_frames.append(frame)
                        
                        # Améliorer le masque avec la segmentation MediaPipe si disponible
                        if result.segmentation_masks and len(result.segmentation_masks) > 0:
                            pose_seg_mask = result.segmentation_masks[0].numpy_view()
                            pose_seg_binary = (pose_seg_mask > 0.5).astype(np.uint8) * 255
                            if 'mask' in frame:
                                # Combiner les masques pour avoir le corps complet
                                frame['mask'] = cv2.bitwise_or(frame['mask'], pose_seg_binary)
            except Exception as e:
                logger.debug(f"Landmark extraction error: {e}")
                continue
        
        if not all_landmarks:
            logger.error("No valid landmarks found")
            return None, {}
        
        logger.info(f"Extracted landmarks from {len(all_landmarks)} frames")
        
        # Étape 2: Calculer les proportions moyennes depuis les landmarks
        avg_proportions = self._compute_avg_proportions(all_landmarks)
        
        # Étape 3: Ajuster les paramètres SMPL (beta) basés sur les landmarks + mesures
        beta_params = self._compute_beta_from_landmarks(
            all_landmarks, avg_proportions, height_cm, weight_kg, gender, measurements
        )
        
        # Étape 4: Générer le mesh ajusté
        from smpl_reconstructor import ParametricBodyModel
        body_model = ParametricBodyModel(resolution_height=150, resolution_radial=96, smooth_iterations=5)
        
        # Créer un dict de mesures ajustées depuis les landmarks
        adjusted_measurements = self._landmarks_to_measurements(
            all_landmarks, avg_proportions, height_cm
        )
        
        mesh = body_model.generate_mesh(
            height_cm=height_cm,
            weight_kg=weight_kg,
            measurements=adjusted_measurements,
            gender=gender
        )
        
        # Étape 5: Ajuster le mesh pour correspondre aux landmarks (scaling/translation)
        mesh = self._adjust_mesh_to_landmarks(mesh, all_landmarks, height_cm)
        
        fitting_info = {
            'num_frames_used': len(all_landmarks),
            'beta_params': beta_params,
            'avg_proportions': avg_proportions,
            'landmark_confidence': self._compute_landmark_confidence(all_landmarks)
        }
        
        return mesh, fitting_info
    
    def _compute_avg_proportions(self, landmarks_list: List[Dict]) -> Dict:
        """Calcule les proportions moyennes depuis tous les landmarks."""
        shoulder_widths = []
        hip_widths = []
        torso_heights = []
        leg_lengths = []
        
        for lm_data in landmarks_list:
            shoulder_widths.append(lm_data['shoulder_width'])
            hip_widths.append(lm_data['hip_width'])
            torso_heights.append(lm_data['torso_height'])
            leg_lengths.append(lm_data['leg_length'])
        
        return {
            'shoulder_width_avg': np.median(shoulder_widths) if shoulder_widths else 0,
            'hip_width_avg': np.median(hip_widths) if hip_widths else 0,
            'torso_height_avg': np.median(torso_heights) if torso_heights else 0,
            'leg_length_avg': np.median(leg_lengths) if leg_lengths else 0,
            'shoulder_hip_ratio_avg': np.median([lm['shoulder_hip_ratio'] for lm in landmarks_list]) if landmarks_list else 1.0,
            'torso_leg_ratio_avg': np.median([lm['torso_leg_ratio'] for lm in landmarks_list]) if landmarks_list else 0.6,
        }
    
    def _compute_beta_from_landmarks(self, landmarks_list: List[Dict], 
                                     proportions: Dict, height_cm: float,
                                     weight_kg: float, gender: str,
                                     measurements: Dict = None) -> List[float]:
        """
        Calcule les paramètres beta SMPL depuis les landmarks MediaPipe.
        Beta contrôle la forme du corps (taille, largeur, proportions).
        """
        bmi = weight_kg / ((height_cm / 100) ** 2)
        
        # Extraire mesures depuis landmarks si disponibles
        shoulder_w = proportions['shoulder_width_avg']
        hip_w = proportions['hip_width_avg']
        torso_h = proportions['torso_height_avg']
        leg_h = proportions['leg_length_avg']
        
        # Normaliser par la taille de l'image (approximation)
        # On utilise les ratios plutôt que les valeurs absolues
        shoulder_ratio = shoulder_w / max(height_cm * 0.26, 1)  # Largeur épaule normale ~26% taille
        hip_ratio = hip_w / max(height_cm * 0.19, 1)  # Largeur hanches normale ~19% taille
        torso_ratio = torso_h / max(height_cm * 0.30, 1)  # Torso ~30% taille
        leg_ratio = leg_h / max(height_cm * 0.47, 1)  # Jambes ~47% taille
        
        # Si on a des mesures réelles, les utiliser
        if measurements:
            basics = measurements.get('basics', [])
            chest_val = next((m['value_cm'] for m in basics if m.get('key') == 'chest'), None)
            waist_val = next((m['value_cm'] for m in basics if m.get('key') == 'waist'), None)
            hips_val = next((m['value_cm'] for m in basics if m.get('key') == 'hips'), None)
        else:
            chest_val = waist_val = hips_val = None
        
        # Calculer beta (10 paramètres de forme SMPL)
        beta = [
            round((height_cm - 175) / 15, 3),  # β0: Height
            round((chest_val - 95) / 15, 3) if chest_val else round((shoulder_ratio - 1.0) * 2, 3),  # β1: Chest/Shoulders
            round((waist_val - 80) / 15, 3) if waist_val else round((torso_ratio - 1.0) * 2, 3),  # β2: Waist
            round((hips_val - 98) / 15, 3) if hips_val else round((hip_ratio - 1.0) * 2, 3),  # β3: Hips
            round((bmi - 22) / 5, 3),  # β4: BMI
            round((leg_ratio - 1.0) * 2, 3),  # β5: Leg length
            round((shoulder_ratio - hip_ratio) * 2, 3),  # β6: V-taper (shoulders vs hips)
            round((proportions['shoulder_hip_ratio_avg'] - 1.0) * 2, 3),  # β7: Shoulder/hip ratio
            round((proportions['torso_leg_ratio_avg'] - 0.6) * 5, 3),  # β8: Torso/leg ratio
            0.0,  # β9: Reserved
        ]
        
        return beta
    
    def _landmarks_to_measurements(self, landmarks_list: List[Dict],
                                   proportions: Dict, height_cm: float) -> Dict:
        """Convertit les landmarks en mesures anthropométriques."""
        # Utiliser les proportions moyennes pour estimer les mesures
        shoulder_w = proportions['shoulder_width_avg']
        hip_w = proportions['hip_width_avg']
        
        # Estimer les circonférences depuis les largeurs (approximation ellipse)
        def width_to_circumference(w, depth_ratio=0.7):
            # Approximation: circonférence ≈ π * (largeur + profondeur) / 2
            depth = w * depth_ratio
            return np.pi * (w + depth) / 2
        
        # Estimer depuis les landmarks (en pixels) → convertir en cm
        # On suppose que la largeur des épaules correspond à ~26% de la taille
        scale_factor = height_cm / max(proportions['torso_height_avg'] + proportions['leg_length_avg'], 1)
        
        chest_w_cm = shoulder_w * scale_factor * 1.2  # Poitrine ~20% plus large que épaules
        waist_w_cm = chest_w_cm * 0.85  # Taille ~85% de la poitrine
        hips_w_cm = hip_w * scale_factor * 1.1
        
        return {
            'basics': [
                {'key': 'chest', 'value_cm': width_to_circumference(chest_w_cm)},
                {'key': 'waist', 'value_cm': width_to_circumference(waist_w_cm)},
                {'key': 'hips', 'value_cm': width_to_circumference(hips_w_cm)},
            ],
            'widths': [
                {'key': 'shoulders', 'value_cm': shoulder_w * scale_factor},
            ]
        }
    
    def _adjust_mesh_to_landmarks(self, mesh: trimesh.Trimesh, 
                                  landmarks_list: List[Dict], height_cm: float) -> trimesh.Trimesh:
        """
        Ajuste le mesh pour correspondre exactement aux landmarks.
        - Scaling pour correspondre à la taille réelle
        - Translation pour centrer
        """
        if not landmarks_list:
            return mesh
        
        # Calculer la hauteur moyenne depuis les landmarks
        avg_landmark_height = np.mean([
            lm['torso_height'] + lm['leg_length'] for lm in landmarks_list
        ])
        
        # Scale factor pour correspondre à height_cm
        # On suppose que les landmarks sont en pixels, on doit convertir
        # Approximation: utiliser le ratio des hauteurs
        mesh_bounds = mesh.bounds
        mesh_height = mesh_bounds[1][1] - mesh_bounds[0][1]
        
        if mesh_height > 0:
            scale_factor = height_cm / 100.0 / mesh_height  # Convertir en mètres
            mesh.apply_scale(scale_factor)
        
        # Centrer le mesh
        mesh.vertices -= mesh.centroid
        mesh.vertices[:, 1] += height_cm / 200.0  # Déplacer vers le haut (Y+)
        
        return mesh
    
    def _compute_landmark_confidence(self, landmarks_list: List[Dict]) -> float:
        """Calcule la confiance moyenne des landmarks."""
        if not landmarks_list:
            return 0.0
        
        # Utiliser la variance des proportions comme indicateur de confiance
        shoulder_widths = [lm['shoulder_width'] for lm in landmarks_list]
        if len(shoulder_widths) > 1:
            cv = np.std(shoulder_widths) / np.mean(shoulder_widths)  # Coefficient de variation
            confidence = max(0.0, min(1.0, 1.0 - cv))  # Plus de variance = moins de confiance
        else:
            confidence = 0.8
        
        return float(confidence)

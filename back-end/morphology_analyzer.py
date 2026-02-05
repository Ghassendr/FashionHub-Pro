"""
Morphology Analyzer Module - Full-Body Precision 360
Analyse morphologique avancée: classification silhouette, proportions, posture
"""

import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from typing import List, Dict, Tuple, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Indices MediaPipe Pose Landmarks
POSE_LANDMARKS = {
    'nose': 0,
    'left_eye_inner': 1, 'left_eye': 2, 'left_eye_outer': 3,
    'right_eye_inner': 4, 'right_eye': 5, 'right_eye_outer': 6,
    'left_ear': 7, 'right_ear': 8,
    'mouth_left': 9, 'mouth_right': 10,
    'left_shoulder': 11, 'right_shoulder': 12,
    'left_elbow': 13, 'right_elbow': 14,
    'left_wrist': 15, 'right_wrist': 16,
    'left_pinky': 17, 'right_pinky': 18,
    'left_index': 19, 'right_index': 20,
    'left_thumb': 21, 'right_thumb': 22,
    'left_hip': 23, 'right_hip': 24,
    'left_knee': 25, 'right_knee': 26,
    'left_ankle': 27, 'right_ankle': 28,
    'left_heel': 29, 'right_heel': 30,
    'left_foot_index': 31, 'right_foot_index': 32
}


class SilhouetteClassifier:
    """Classification de la silhouette corporelle"""
    
    BODY_TYPES = {
        'slim': {'fr': 'Mince', 'description': 'Silhouette fine et élancée'},
        'normal': {'fr': 'Normal', 'description': 'Silhouette équilibrée'},
        'athletic': {'fr': 'Athlétique', 'description': 'Silhouette musclée, épaules larges'},
        'large': {'fr': 'Large', 'description': 'Silhouette corpulente'}
    }
    
    def classify(self, measurements: Dict, height_cm: float, weight_kg: float) -> Dict:
        """
        Classifie la silhouette basée sur les mesures et l'IMC
        """
        # Calcul IMC
        height_m = height_cm / 100.0
        bmi = weight_kg / (height_m * height_m) if height_m > 0 else 22
        
        # Extraire mesures clés
        chest = self._get_measure(measurements, 'chest', 95)
        waist = self._get_measure(measurements, 'waist', 80)
        hips = self._get_measure(measurements, 'hips', 100)
        shoulders = self._get_measure(measurements, 'shoulders', 45)
        
        # Calcul ratios
        waist_to_hip = waist / hips if hips > 0 else 0.8
        waist_to_chest = waist / chest if chest > 0 else 0.85
        shoulder_to_waist = shoulders / waist if waist > 0 else 0.55
        
        # Classification basée sur multiple critères
        scores = {
            'slim': 0,
            'normal': 0,
            'athletic': 0,
            'large': 0
        }
        
        # IMC scoring
        if bmi < 18.5:
            scores['slim'] += 3
        elif bmi < 25:
            scores['normal'] += 2
            if bmi < 22:
                scores['slim'] += 1
            else:
                scores['athletic'] += 1
        elif bmi < 30:
            scores['large'] += 1
            scores['athletic'] += 1
        else:
            scores['large'] += 3
        
        # Ratio taille/hanches
        if waist_to_hip < 0.75:
            scores['slim'] += 2
        elif waist_to_hip < 0.85:
            scores['normal'] += 2
        elif waist_to_hip < 0.95:
            scores['athletic'] += 1
        else:
            scores['large'] += 2
        
        # Ratio épaules/taille (pour athlétique)
        if shoulder_to_waist > 0.6:
            scores['athletic'] += 2
        elif shoulder_to_waist > 0.55:
            scores['athletic'] += 1
        
        # Déterminer le type dominant
        body_type = max(scores, key=scores.get)
        confidence = scores[body_type] / sum(scores.values()) if sum(scores.values()) > 0 else 0.5
        
        return {
            'type': body_type,
            'type_fr': self.BODY_TYPES[body_type]['fr'],
            'description': self.BODY_TYPES[body_type]['description'],
            'confidence': round(confidence, 2),
            'bmi': round(bmi, 1),
            'bmi_category': self._get_bmi_category(bmi),
            'ratios': {
                'waist_to_hip': round(waist_to_hip, 3),
                'waist_to_chest': round(waist_to_chest, 3),
                'shoulder_to_waist': round(shoulder_to_waist, 3)
            }
        }
    
    def _get_measure(self, measurements: Dict, key: str, default: float) -> float:
        """Extrait une mesure du dictionnaire (format plat ou catégorisé)"""
        if isinstance(measurements, dict):
            for category in ['basics', 'widths', 'heights', 'functional']:
                if category in measurements:
                    for m in measurements[category]:
                        if m.get('key') == key:
                            return m.get('value_cm', default)
        return default
    
    def _get_bmi_category(self, bmi: float) -> str:
        if bmi < 18.5:
            return 'Insuffisance pondérale'
        elif bmi < 25:
            return 'Poids normal'
        elif bmi < 30:
            return 'Surpoids'
        else:
            return 'Obésité'


class ProportionsAnalyzer:
    """Analyse des proportions corporelles"""
    
    def analyze(self, landmarks_data: List[Dict], height_cm: float) -> Dict:
        """
        Analyse les proportions du corps basées sur les landmarks de pose
        """
        if not landmarks_data:
            return self._get_default_proportions()
        
        # Moyenner sur plusieurs frames pour plus de précision
        torso_ratios = []
        leg_ratios = []
        arm_ratios = []
        
        for frame_lms in landmarks_data:
            if 'landmarks' not in frame_lms:
                continue
                
            lms = frame_lms['landmarks']
            h = frame_lms.get('height', 1)
            
            # Calculer proportions normalisées
            try:
                # Torse: épaules à hanches
                shoulder_y = (lms[11]['y'] + lms[12]['y']) / 2
                hip_y = (lms[23]['y'] + lms[24]['y']) / 2
                torso_len = abs(hip_y - shoulder_y)
                
                # Jambes: hanches à chevilles
                ankle_y = (lms[27]['y'] + lms[28]['y']) / 2
                leg_len = abs(ankle_y - hip_y)
                
                # Bras: épaule à poignet
                arm_len_l = self._distance(lms[11], lms[15])
                arm_len_r = self._distance(lms[12], lms[16])
                arm_len = (arm_len_l + arm_len_r) / 2
                
                total_height = abs(lms[0]['y'] - ankle_y)  # Nez à chevilles approximation
                
                if total_height > 0:
                    torso_ratios.append(torso_len / total_height)
                    leg_ratios.append(leg_len / total_height)
                    arm_ratios.append(arm_len / total_height)
                    
            except (KeyError, IndexError, ZeroDivisionError):
                continue
        
        if not torso_ratios:
            return self._get_default_proportions()
        
        # Calculer moyennes
        avg_torso = np.median(torso_ratios)
        avg_legs = np.median(leg_ratios)
        avg_arms = np.median(arm_ratios)
        
        # Convertir en cm
        torso_cm = avg_torso * height_cm
        legs_cm = avg_legs * height_cm
        arms_cm = avg_arms * height_cm
        
        # Ratio torso/jambes
        torso_to_legs = avg_torso / avg_legs if avg_legs > 0 else 1.0
        
        # Classification des proportions
        proportion_type = self._classify_proportions(torso_to_legs)
        
        return {
            'torso_ratio': round(avg_torso, 3),
            'legs_ratio': round(avg_legs, 3),
            'arms_ratio': round(avg_arms, 3),
            'torso_cm': round(torso_cm, 1),
            'legs_cm': round(legs_cm, 1),
            'arms_cm': round(arms_cm, 1),
            'torso_to_legs_ratio': round(torso_to_legs, 3),
            'proportion_type': proportion_type,
            'confidence': 0.85
        }
    
    def _distance(self, p1: Dict, p2: Dict) -> float:
        """Calcule la distance euclidienne 2D entre deux points"""
        return np.sqrt((p1['x'] - p2['x'])**2 + (p1['y'] - p2['y'])**2)
    
    def _classify_proportions(self, ratio: float) -> Dict:
        """Classifie le type de proportions"""
        if ratio < 0.55:
            return {'type': 'long_legs', 'fr': 'Jambes longues', 'description': 'Jambes proportionnellement plus longues'}
        elif ratio > 0.75:
            return {'type': 'long_torso', 'fr': 'Torse long', 'description': 'Torse proportionnellement plus long'}
        else:
            return {'type': 'balanced', 'fr': 'Équilibré', 'description': 'Proportions équilibrées'}
    
    def _get_default_proportions(self) -> Dict:
        return {
            'torso_ratio': 0.30,
            'legs_ratio': 0.47,
            'arms_ratio': 0.35,
            'torso_cm': 52.5,
            'legs_cm': 82.0,
            'arms_cm': 61.0,
            'torso_to_legs_ratio': 0.64,
            'proportion_type': {'type': 'balanced', 'fr': 'Équilibré', 'description': 'Proportions standard'},
            'confidence': 0.5
        }


class PostureAnalyzer:
    """Analyse de la posture corporelle"""
    
    def analyze(self, landmarks_data: List[Dict]) -> Dict:
        """
        Analyse la posture basée sur les landmarks de pose
        Détecte: posture droite, penchée, asymétries
        """
        if not landmarks_data:
            return self._get_default_posture()
        
        shoulder_tilts = []
        hip_tilts = []
        spine_angles = []
        
        for frame_lms in landmarks_data:
            if 'landmarks' not in frame_lms:
                continue
                
            lms = frame_lms['landmarks']
            
            try:
                # Inclinaison des épaules (différence de hauteur Y)
                left_shoulder = lms[11]
                right_shoulder = lms[12]
                shoulder_tilt = abs(left_shoulder['y'] - right_shoulder['y'])
                shoulder_tilts.append(shoulder_tilt)
                
                # Inclinaison des hanches
                left_hip = lms[23]
                right_hip = lms[24]
                hip_tilt = abs(left_hip['y'] - right_hip['y'])
                hip_tilts.append(hip_tilt)
                
                # Angle de la colonne (nez - milieu épaules - milieu hanches)
                mid_shoulder_x = (left_shoulder['x'] + right_shoulder['x']) / 2
                mid_shoulder_y = (left_shoulder['y'] + right_shoulder['y']) / 2
                mid_hip_x = (left_hip['x'] + right_hip['x']) / 2
                mid_hip_y = (left_hip['y'] + right_hip['y']) / 2
                
                # Angle de déviation latérale
                if mid_hip_y != mid_shoulder_y:
                    spine_angle = np.arctan2(mid_hip_x - mid_shoulder_x, mid_hip_y - mid_shoulder_y)
                    spine_angles.append(np.degrees(spine_angle))
                    
            except (KeyError, IndexError):
                continue
        
        if not shoulder_tilts:
            return self._get_default_posture()
        
        # Moyennes
        avg_shoulder_tilt = np.median(shoulder_tilts)
        avg_hip_tilt = np.median(hip_tilts)
        avg_spine_angle = np.median(spine_angles) if spine_angles else 0
        
        # Détection des problèmes
        issues = []
        
        # Seuils (normalisés, en fraction de hauteur image)
        TILT_THRESHOLD = 0.02  # 2% de différence de hauteur
        SPINE_THRESHOLD = 5  # 5 degrés de déviation
        
        if avg_shoulder_tilt > TILT_THRESHOLD:
            issues.append({
                'type': 'shoulder_asymmetry',
                'fr': 'Asymétrie des épaules',
                'severity': 'moderate' if avg_shoulder_tilt < TILT_THRESHOLD * 2 else 'important'
            })
        
        if avg_hip_tilt > TILT_THRESHOLD:
            issues.append({
                'type': 'hip_asymmetry',
                'fr': 'Asymétrie des hanches',
                'severity': 'moderate' if avg_hip_tilt < TILT_THRESHOLD * 2 else 'important'
            })
        
        if abs(avg_spine_angle) > SPINE_THRESHOLD:
            direction = 'gauche' if avg_spine_angle > 0 else 'droite'
            issues.append({
                'type': 'lateral_lean',
                'fr': f'Inclinaison latérale ({direction})',
                'severity': 'moderate' if abs(avg_spine_angle) < SPINE_THRESHOLD * 2 else 'important'
            })
        
        # Déterminer posture globale
        if not issues:
            posture_type = 'straight'
            posture_fr = 'Droite'
            posture_desc = 'Posture équilibrée et droite'
        elif len(issues) == 1 and issues[0]['severity'] == 'moderate':
            posture_type = 'slightly_tilted'
            posture_fr = 'Légèrement inclinée'
            posture_desc = 'Légère asymétrie détectée'
        else:
            posture_type = 'asymmetric'
            posture_fr = 'Asymétrique'
            posture_desc = 'Asymétries importantes détectées'
        
        return {
            'type': posture_type,
            'type_fr': posture_fr,
            'description': posture_desc,
            'issues': issues,
            'metrics': {
                'shoulder_tilt': round(avg_shoulder_tilt * 100, 2),  # en pourcentage
                'hip_tilt': round(avg_hip_tilt * 100, 2),
                'spine_angle': round(avg_spine_angle, 1)
            },
            'confidence': 0.80
        }
    
    def _get_default_posture(self) -> Dict:
        return {
            'type': 'unknown',
            'type_fr': 'Non déterminée',
            'description': 'Données insuffisantes pour analyse',
            'issues': [],
            'metrics': {
                'shoulder_tilt': 0,
                'hip_tilt': 0,
                'spine_angle': 0
            },
            'confidence': 0.0
        }


class MorphologyAnalyzer:
    """
    Analyseur morphologique complet
    Combine classification silhouette, proportions et posture
    """
    
    def __init__(self):
        self.silhouette_classifier = SilhouetteClassifier()
        self.proportions_analyzer = ProportionsAnalyzer()
        self.posture_analyzer = PostureAnalyzer()
        
        # Charger le modèle de pose si disponible
        try:
            model_path = os.path.abspath('models/pose_landmarker_full.task')
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.PoseLandmarkerOptions(base_options=base_options, num_poses=1)
            self.pose_detector = vision.PoseLandmarker.create_from_options(options)
            self.model_loaded = True
        except Exception as e:
            logger.warning(f"Pose model not loaded: {e}")
            self.model_loaded = False
    
    def analyze(self, frames: List[Dict], measurements: Dict, 
                height_cm: float, weight_kg: float) -> Dict:
        """
        Analyse morphologique complète
        
        Args:
            frames: Liste des frames avec chemins et masques
            measurements: Mesures corporelles extraites
            height_cm: Taille déclarée par l'utilisateur
            weight_kg: Poids déclaré par l'utilisateur
        
        Returns:
            Dictionnaire avec analyse morphologique complète
        """
        logger.info("Analyse morphologique avancée...")
        
        # Extraire landmarks de pose
        landmarks_data = self._extract_landmarks(frames)
        
        # 1. Classification silhouette
        silhouette = self.silhouette_classifier.classify(measurements, height_cm, weight_kg)
        
        # 2. Analyse des proportions
        proportions = self.proportions_analyzer.analyze(landmarks_data, height_cm)
        
        # 3. Analyse de la posture
        posture = self.posture_analyzer.analyze(landmarks_data)
        
        # Score global de qualité morphologique
        quality_score = self._calculate_quality_score(silhouette, proportions, posture)
        
        return {
            'silhouette': silhouette,
            'proportions': proportions,
            'posture': posture,
            'quality_score': quality_score,
            'summary': self._generate_summary(silhouette, proportions, posture)
        }
    
    def _extract_landmarks(self, frames: List[Dict]) -> List[Dict]:
        """Extrait les landmarks de pose de frames sélectionnées"""
        if not self.model_loaded:
            return []
        
        landmarks_data = []
        # Échantillonner quelques frames
        sample_indices = np.linspace(0, len(frames)-1, min(10, len(frames)), dtype=int)
        
        for idx in sample_indices:
            frame = frames[idx]
            if not frame.get('body_detected'):
                continue
                
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                    
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                result = self.pose_detector.detect(mp_img)
                
                if result.pose_landmarks:
                    lms = result.pose_landmarks[0]
                    landmarks_dict = {
                        i: {'x': lm.x, 'y': lm.y, 'z': lm.z, 'visibility': lm.visibility}
                        for i, lm in enumerate(lms)
                    }
                    landmarks_data.append({
                        'landmarks': landmarks_dict,
                        'height': img.shape[0],
                        'width': img.shape[1],
                        'rotation_angle': frame.get('rotation_angle', 0)
                    })
            except Exception as e:
                logger.debug(f"Landmark extraction error: {e}")
                continue
        
        return landmarks_data
    
    def _calculate_quality_score(self, silhouette: Dict, proportions: Dict, posture: Dict) -> float:
        """Calcule un score de qualité global"""
        scores = [
            silhouette.get('confidence', 0.5),
            proportions.get('confidence', 0.5),
            posture.get('confidence', 0.5)
        ]
        return round(np.mean(scores), 2)
    
    def _generate_summary(self, silhouette: Dict, proportions: Dict, posture: Dict) -> Dict:
        """Génère un résumé textuel de l'analyse"""
        return {
            'fr': f"Morphologie {silhouette.get('type_fr', 'N/A')} avec {proportions.get('proportion_type', {}).get('fr', 'proportions standard')}. Posture: {posture.get('type_fr', 'N/A')}.",
            'en': f"{silhouette.get('type', 'normal').capitalize()} body type with {proportions.get('proportion_type', {}).get('type', 'balanced')} proportions. Posture: {posture.get('type', 'unknown')}."
        }

"""
SMPL/SMPL-X Reconstructor
Transforme une séquence vidéo 2D en avatar 3D SMPL(-X) canonique.

⚠️ Objectif :
- Plus de génération géométrique manuelle (lofting, tubes, smoothing laplacien, etc.)
- SMPL(-X) est l'unique générateur de mesh (topologie canonique)
- On estime uniquement les paramètres (β, θ, caméra)

Cette implémentation fournit :
- Un wrapper `SMPLReconstructor` autour du modèle SMPL-X (via `smplx`)
- Une initialisation simple de la forme (β) à partir de la biométrie
- Une pose neutre (T-pose) pour un mesh prêt pour couture / retargeting

Étapes plus avancées (fitting différentiable multi-frames, VIBE/HMR, pertes silhouette)
peuvent être ajoutées sur cette base sans réintroduire de géométrie artisanale.
"""

import os
import logging
from typing import List, Dict, Tuple, Optional, Any

import cv2
import numpy as np
import torch
import trimesh
import smplx

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)


class SMPLReconstructor:
    """
    Reconstructeur SMPL-X : vidéo 2D → avatar 3D canonique.

    - Utilise MediaPipe Pose pour extraire des informations de proportions
    - Utilise SMPL-X comme unique générateur de mesh (vertices, faces, joints)
    - Évite toute génération manuelle de géométrie (pas de lofting / tubes)

    NOTE IMPORTANTE :
    Cette première version ne fait PAS encore le fitting différentiable complet
    décrit dans le pipeline (L_kp, L_sil, L_temp, etc.). Elle :
      - Initialise β à partir de height_cm / weight_kg
      - Produit un mesh SMPL-X en pose neutre (T-pose)
    Ce mesh est déjà :
      - topologie canonique
      - riggé correctement
      - exploitable pour couture / retargeting
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
    ) -> None:
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Résolution SMPL-X (peut être ajustée si besoin)
        self.num_betas = 10

        # Chemin modèle SMPL-X
        if model_path is None:
            # Par convention : back-end/models/smplx
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "models", "smplx")
        self.model_path = model_path

        if not os.path.exists(self.model_path):
            logger.warning(
                "SMPL-X model directory not found at %s. "
                "Please download SMPL-X and place it in back-end/models/smplx.",
                self.model_path,
            )

        # Modèle SMPL-X neutre (unisex) – topologie canonique
        try:
            self.model = smplx.create(
                self.model_path,
                model_type="smplx",
                gender="neutral",
                use_pca=False,
                num_betas=self.num_betas,
                flat_hand_mean=True,
                batch_size=1,
            ).to(self.device)
            logger.info("SMPL-X model loaded from %s", self.model_path)
        except Exception as e:
            logger.error("Failed to load SMPL-X model: %s", e)
            self.model = None

        # Détecteur de pose MediaPipe (pour analyse ultérieure, ex: proportions)
        self.pose_detector = None
        self._init_pose_detector()

    def _init_pose_detector(self) -> None:
        """Initialize MediaPipe Pose detector."""
        try:
            model_path = os.path.abspath('models/pose_landmarker_full.task')
            if os.path.exists(model_path):
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options, 
                    num_poses=1,
                    output_segmentation_masks=False
                )
                self.pose_detector = vision.PoseLandmarker.create_from_options(options)
                logger.info("Pose detector initialized")
            else:
                logger.warning("Pose model not found: %s", model_path)
        except Exception as e:
            logger.error("Failed to initialize pose detector: %s", e)

    # -------------------------------------------------------------------------
    # API principale
    # -------------------------------------------------------------------------
    def fit(
        self,
        frames: List[Dict],
        height_cm: float = 175.0,
        weight_kg: float = 70.0,
        gender: str = "neutral",
        output_path: Optional[str] = None,
        preset: Any = None,
    ) -> Tuple[bool, Optional[str], Dict]:
        """
        Vidéo → avatar SMPL-X.

        Version actuelle (simplifiée) :
        - Utilise uniquement height_cm / weight_kg pour initialiser β
        - Produit un mesh en T-pose (θ = 0)
        - Topologie canonique prête pour couture / animation

        TODO (évolutions futures) :
        - Fitting différentiable multi-frames (L_kp, L_sil, L_temp, etc.)
        - Intégration de VIBE / HMR pour theta_init / beta_init
        """
        if self.model is None:
            logger.error("SMPL-X model is not available. Aborting reconstruction.")
            return False, None, {}

        # Échelle réelle → contrainte sur la taille du mesh SMPL-X
        height_m = height_cm / 100.0

        # Approximation simple de β (shape) à partir de BMI + taille
        betas = self._init_betas_from_biometrics(height_cm, weight_kg)

        # Pose neutre (T-pose) pour couture / retargeting
        global_orient = torch.zeros(1, 3, device=self.device)
        body_pose = torch.zeros(1, 63, device=self.device)  # 21 joints * 3
        left_hand_pose = torch.zeros(1, 45, device=self.device)
        right_hand_pose = torch.zeros(1, 45, device=self.device)
        jaw_pose = torch.zeros(1, 3, device=self.device)
        leye_pose = torch.zeros(1, 3, device=self.device)
        reye_pose = torch.zeros(1, 3, device=self.device)

        # Translation : centrée à l'origine, échelle contrôlée par height_cm
        transl = torch.zeros(1, 3, device=self.device)

        with torch.no_grad():
            output = self.model(
                betas=betas,
                global_orient=global_orient,
                body_pose=body_pose,
                left_hand_pose=left_hand_pose,
                right_hand_pose=right_hand_pose,
                jaw_pose=jaw_pose,
                leye_pose=leye_pose,
                reye_pose=reye_pose,
                transl=transl,
            )

        vertices = output.vertices[0].cpu().numpy()
        faces = self.model.faces

        # Mise à l'échelle en hauteur réelle (height_cm)
        min_y, max_y = vertices[:, 1].min(), vertices[:, 1].max()
        smpl_height = max_y - min_y
        if smpl_height > 0:
            scale = height_m / smpl_height
            vertices *= scale

        mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)

        # Export GLB
        glb_path = None
        if output_path:
            glb_path = output_path if output_path.endswith(".glb") else output_path.replace(".obj", ".glb")
            try:
                mesh.export(glb_path)
                logger.info("SMPL-X mesh saved to: %s", glb_path)
            except Exception as e:
                logger.error("Failed to save SMPL-X GLB: %s", e)
                glb_path = None

        # Paramètres retournés (β au format liste Python)
        smpl_params = {
            "beta": betas[0].cpu().tolist(),
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "gender": gender,
        }

        return True, glb_path, smpl_params

    # -------------------------------------------------------------------------
    # Initialisation des paramètres de forme (β)
    # -------------------------------------------------------------------------
    def _init_betas_from_biometrics(self, height_cm: float, weight_kg: float) -> torch.Tensor:
        """
        Approximation simple de β à partir de height_cm et weight_kg.

        Cette fonction ne remplace PAS un vrai regressor (VIBE / HMR),
        mais fournit une initialisation cohérente pour la forme.
        """
        bmi = weight_kg / ((height_cm / 100.0) ** 2) if height_cm > 0 else 22.0
        bmi_n = (bmi - 22.0) / 5.0  # Normalisé autour de l'IMC moyen
        height_n = (height_cm - 175.0) / 15.0

        # β0 ~ taille, β1 ~ corpulence (bmi), les autres à 0 pour l'instant
        beta = torch.zeros(1, self.num_betas, device=self.device)
        beta[0, 0] = float(height_n)
        if self.num_betas > 1:
            beta[0, 1] = float(bmi_n)

        return beta


    def correct_angles(self, frames: List[Dict]):
        """
        Phase 3: Correct frame angles using pose estimation.
        Detects Front, Side, and Back views to align the 360° rotation.
        """
        if not self.pose_detector:
            return
            
        logger.info("Correcting angles using pose analysis...")
        
        # Extract pose features for all frames
        pose_features = []
        valid_indices = []
        
        for i, frame in enumerate(frames):
            if not frame.get('body_detected'):
                continue
                
            try:
                img = cv2.imread(frame['path'])
                if img is None: continue
                
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                result = self.pose_detector.detect(mp_image)
                
                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    lms = result.pose_landmarks[0]
                    
                    # Shoulders and Hips
                    l_sh = lms[11]; r_sh = lms[12]
                    l_hip = lms[23]; r_hip = lms[24]
                    nose = lms[0]
                    
                    # 1. Shoulder projected width (2D x-axis)
                    shoulder_width = abs(l_sh.x - r_sh.x)
                    
                    # 2. Shoulder depth difference (z-axis)
                    # if l_sh.z < r_sh.z, left is closer (turning right?)
                    shoulder_depth = l_sh.z - r_sh.z
                    
                    # 3. Nose position relative to shoulder center
                    shoulder_center_x = (l_sh.x + r_sh.x) / 2
                    nose_offset = nose.x - shoulder_center_x
                    
                    pose_features.append({
                        'idx': i,
                        'sh_width': shoulder_width,
                        'sh_depth': shoulder_depth,
                        'nose_offset': nose_offset,
                        'orig_angle': frame.get('rotation_angle', 0)
                    })
                    valid_indices.append(i)
            except Exception:
                continue
                
        if len(pose_features) < 10:
            logger.warning("Not enough poses for angle correction, using linear.")
            return

        # Smooth features
        widths = np.array([p['sh_width'] for p in pose_features])
        # Smooth width to find reliable peaks/valleys
        widths_smooth = np.convolve(widths, np.ones(5)/5, mode='same')
        
        # Find Keyframes
        
        # Front view: Max width, Nose centered
        # We look for the global measurement of 'Front'
        # Heuristic: Find peaks in shoulder width
        max_width = np.max(widths_smooth)
        front_indices = [i for i, w in enumerate(widths_smooth) if w > max_width * 0.9]
        
        # Side view: Min width
        min_width = np.min(widths_smooth)
        side_indices = [i for i, w in enumerate(widths_smooth) if w < min_width * 1.5]
        
        # Assign Angles
        # We assume the video starts roughly Front (0 or 360) or finding the first 'Front'
        
        # Simplest robust approach: 
        # 1. Find the frame with absolute max width (Front or Back)
        # 2. Check nose visibility/z-depth to distinguish Front vs Back?
        #    MediaPipe z is relative. 
        #    Better: Detect sequence.
        
        # Let's map normalized cumulative index to 0..360 but warped by keypoints
        # For now, let's implement a simple "Anchor" system
        
        # Find index of Max Width (Front)
        best_front_idx = -1
        max_w = -1
        
        for i, f in enumerate(pose_features):
            # Check if nose is roughly centered
            if abs(f['nose_offset']) < 0.05 and f['sh_width'] > max_w:
                max_w = f['sh_width']
                best_front_idx = i
        
        if best_front_idx == -1:
            best_front_idx = np.argmax(widths)
            
        # Re-center angles so best_front is 0°
        # Assuming linear rotation speed but unknown start
        
        total_frames = len(frames)
        front_frame_idx = pose_features[best_front_idx]['idx']
        
        # Shift all angles
        shift = front_frame_idx / total_frames * 360.0
        
        for frame in frames:
            # Current naive angle
            naive = frame['rotation_angle']
            # Corrected: make front_frame 0 (or 360)
            corrected = (naive - shift) % 360
            frame['rotation_angle'] = corrected
            
        logger.info(f"Angles corrected. Front detected at frame {front_frame_idx}")
    
    def _analyze_poses(self, frames: List[Dict]) -> Dict:
        """Analyze poses across frames to extract body proportions."""
        
        if not self.pose_detector:
            return {}
        
        pose_data = []
        
        # Sample frames for pose analysis (increased for better accuracy)
        valid_frames = [f for f in frames if f.get('body_detected', True)]
        sample_indices = np.linspace(0, len(valid_frames) - 1, min(60, len(valid_frames)), dtype=int)
        
        for idx in sample_indices:
            frame = valid_frames[idx]
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                    
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                
                result = self.pose_detector.detect(mp_image)
                
                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    landmarks = result.pose_landmarks[0]
                    pose_data.append({
                        'landmarks': [(lm.x, lm.y, lm.z) for lm in landmarks],
                        'frame': frame['frame_number']
                    })
            except Exception as e:
                logger.debug(f"Pose detection error: {e}")
                continue
        
        if not pose_data:
            return {}
        
        # Average pose proportions
        avg_proportions = self._compute_avg_proportions(pose_data)
        
        return {
            'num_poses': len(pose_data),
            'proportions': avg_proportions
        }
    
    def _compute_avg_proportions(self, pose_data: List[Dict]) -> Dict:
        """Compute average body proportions from pose landmarks."""
        
        # MediaPipe landmark indices
        LEFT_SHOULDER = 11
        RIGHT_SHOULDER = 12
        LEFT_HIP = 23
        RIGHT_HIP = 24
        LEFT_KNEE = 25
        RIGHT_KNEE = 26
        LEFT_ANKLE = 27
        RIGHT_ANKLE = 28
        
        shoulder_widths = []
        hip_widths = []
        torso_lengths = []
        leg_lengths = []
        
        for pose in pose_data:
            lms = pose['landmarks']
            
            # Shoulder width (horizontal distance)
            sw = abs(lms[LEFT_SHOULDER][0] - lms[RIGHT_SHOULDER][0])
            shoulder_widths.append(sw)
            
            # Hip width
            hw = abs(lms[LEFT_HIP][0] - lms[RIGHT_HIP][0])
            hip_widths.append(hw)
            
            # Torso length (shoulder to hip vertical)
            torso = abs(lms[LEFT_SHOULDER][1] - lms[LEFT_HIP][1])
            torso_lengths.append(torso)
            
            # Leg length (hip to ankle)
            leg = abs(lms[LEFT_HIP][1] - lms[LEFT_ANKLE][1])
            leg_lengths.append(leg)
        
        return {
            'shoulder_width_ratio': np.median(shoulder_widths) if shoulder_widths else 0.26,
            'hip_width_ratio': np.median(hip_widths) if hip_widths else 0.17,
            'torso_ratio': np.median(torso_lengths) if torso_lengths else 0.30,
            'leg_ratio': np.median(leg_lengths) if leg_lengths else 0.47
        }
    
    def _analyze_silhouettes(self, frames: List[Dict], height_cm: float,
                             front_side_frames: int = 16) -> Dict:
        """Analyze silhouettes to extract body measurements (robuste multi-vues)."""
        valid_frames = [f for f in frames if f.get('body_detected') and 'mask' in f]
        if not valid_frames:
            return {'measurements': None}
        n = min(front_side_frames, len(valid_frames))
        # Front: 0° ou 180°; Side: 90° ou 270°
        front_frames = sorted(valid_frames, key=lambda f: min(
            abs(f['rotation_angle'] % 360),
            abs((f['rotation_angle'] % 360) - 180)
        ))[:n]
        side_frames = sorted(valid_frames, key=lambda f: min(
            abs((f['rotation_angle'] % 360) - 90),
            abs((f['rotation_angle'] % 360) - 270)
        ))[:n]
        
        # Measure widths from front view
        front_widths = self._measure_widths(front_frames, height_cm)
        
        # Measure depths from side view
        side_depths = self._measure_widths(side_frames, height_cm)
        
        # Combine into measurements
        measurements = self._combine_measurements(front_widths, side_depths, height_cm)
        
        return {'measurements': measurements}
    
    def _measure_widths(self, frames: List[Dict], height_cm: float) -> Dict:
        """
        Measure body widths at different height levels from silhouettes.
        Uses multiple frames and height levels for accurate measurements.
        """
        
        # Extended height ratios for detailed body profiling (20 levels)
        height_ratios = {
            'head_top': 0.98,
            'forehead': 0.95,
            'face': 0.92,
            'chin': 0.88,
            'neck': 0.82,
            'shoulders': 0.78,
            'upper_chest': 0.72,
            'chest': 0.68,
            'lower_chest': 0.64,
            'upper_waist': 0.60,
            'waist': 0.58,
            'lower_waist': 0.55,
            'hips': 0.50,
            'upper_thigh': 0.45,
            'mid_thigh': 0.38,
            'thigh': 0.35,
            'knee': 0.27,
            'calf': 0.18,
            'ankle': 0.08,
            'foot': 0.02
        }
        
        widths = {level: [] for level in height_ratios.keys()}
        
        # Use more frames for averaging (up to 10 per view)
        sample_frames = frames[:min(10, len(frames))]
        
        for frame in sample_frames:
            mask = frame.get('mask')
            if mask is None:
                continue
            
            h, w = mask.shape
            rows = np.where(np.any(mask > 0, axis=1))[0]
            if len(rows) < 10:  # Need enough body pixels
                continue
            
            body_top = rows[0]
            body_bottom = rows[-1]
            body_height = body_bottom - body_top
            
            if body_height < 100:  # Minimum body height in pixels
                continue
            
            # Scale factor: pixels to cm
            scale = height_cm / body_height
            
            for level, ratio in height_ratios.items():
                y = int(body_top + (1 - ratio) * body_height)
                y = max(0, min(h - 1, y))
                
                row = mask[y, :]
                cols = np.where(row > 0)[0]
                
                if len(cols) > 5:  # Minimum width in pixels
                    width_px = cols[-1] - cols[0]
                    width_cm = width_px * scale
                    
                    # Quality filter: width should be reasonable
                    if 3 < width_cm < 100:  # Between 3cm and 100cm
                        widths[level].append(width_cm)
        
        # Median robuste et rejet d'outliers (percentile) pour différentes vidéos
        result = {}
        for k, v in widths.items():
            if not v:
                result[k] = None
                continue
            arr = np.array(v)
            if len(arr) > 4:
                q1, q3 = np.percentile(arr, [25, 75])
                iqr = q3 - q1
                if iqr > 0:
                    arr = arr[(arr >= q1 - 1.5 * iqr) & (arr <= q3 + 1.5 * iqr)]
            if len(arr) > 0:
                result[k] = {
                    'value': float(np.median(arr)),
                    'std': float(np.std(arr)) if len(arr) > 1 else 0.0,
                    'samples': len(arr)
                }
            else:
                result[k] = None
        return result
    
    def _combine_measurements(self, front: Dict, side: Dict, height_cm: float) -> Dict:
        """Combine front and side measurements into circumferences with anatomical clamping."""
        
        # Helper: Ellipse Circumference (Ramanujan approximation)
        def ellipse_circumference(w, d):
            if w is None or d is None: return None
            # w, d are diameters -> radius = w/2, d/2
            a = w / 2.0
            b = d / 2.0
            return np.pi * (3*(a+b) - np.sqrt((3*a + b) * (a + 3*b)))

        # Estimate circumference from width and depth using ellipse formula
        # If we only have front view, estimate depth as 70% of width
        def estimate_circ(width):
            if width is None:
                return None
            depth = width * 0.7
            return ellipse_circumference(width, depth)

        def get_width(data, key):
            if not data or key not in data:
                return None
            item = data[key]
            if isinstance(item, dict):
                return item.get('value')
            return item

        def get_confidence(data, key):
            if not data or key not in data:
                return 0.0
            item = data[key]
            if isinstance(item, dict):
                # Calculate confidence based on variance (std) and sample count
                std = item.get('std', 1.0)
                samples = item.get('samples', 1)
                # Lower std = higher confidence, Higher samples = higher confidence
                conf = 0.5 + (0.5 * (1.0 / (1.0 + std))) * (min(samples, 10) / 10.0)
                return min(0.99, conf)
            return 0.8
        
        measurements = {
            'basics': [],
            'heights': [],
            'widths': [],
            'functional': []
        }
        
        # Chest
        chest_w = get_width(front, 'chest')
        chest_d = get_width(side, 'chest') if side else (chest_w * 0.75 if chest_w else None)
        chest_c = ellipse_circumference(chest_w, chest_d) if chest_w and chest_d else estimate_circ(chest_w)
        if chest_c:
            measurements['basics'].append({
                'key': 'chest', 'name': 'Tour de Poitrine', 
                'value_cm': round(chest_c, 1), 
                'confidence': round(get_confidence(front, 'chest'), 2)
            })
        
        # Waist
        waist_w = get_width(front, 'waist')
        waist_c = estimate_circ(waist_w)
        if waist_c:
            measurements['basics'].append({
                'key': 'waist', 'name': 'Tour de Taille',
                'value_cm': round(waist_c, 1), 
                'confidence': round(get_confidence(front, 'waist'), 2)
            })
        
        # Hips
        hips_w = get_width(front, 'hips')
        hips_c = estimate_circ(hips_w)
        if hips_c:
            measurements['basics'].append({
                'key': 'hips', 'name': 'Tour de Hanches',
                'value_cm': round(hips_c, 1), 
                'confidence': round(get_confidence(front, 'hips'), 2)
            })
        
        # Neck
        neck_w = get_width(front, 'neck')
        neck_c = estimate_circ(neck_w)
        if neck_c:
            measurements['basics'].append({
                'key': 'neck', 'name': 'Tour de Cou',
                'value_cm': round(neck_c, 1), 
                'confidence': round(get_confidence(front, 'neck'), 2)
            })
        
        # Thigh
        thigh_w = get_width(front, 'thigh')
        thigh_c = estimate_circ(thigh_w)
        if thigh_c:
            measurements['basics'].append({
                'key': 'thigh', 'name': 'Tour de Cuisse',
                'value_cm': round(thigh_c, 1), 
                'confidence': round(get_confidence(front, 'thigh'), 2)
            })
        
        # Shoulders width (not circumference)
        shoulders_w = get_width(front, 'shoulders')
        if shoulders_w:
            measurements['widths'].append({
                'key': 'shoulders', 'name': 'Largeur Épaules',
                'value_cm': round(shoulders_w, 1), 
                'confidence': round(get_confidence(front, 'shoulders'), 2)
            })
        
        return measurements if any(measurements.values()) else None
    
    def _compute_shape_params(self, silhouette_params: Dict, 
                              height_cm: float, weight_kg: float) -> Dict:
        """Compute SMPL-like shape (beta) parameters."""
        
        bmi = weight_kg / ((height_cm / 100) ** 2)
        
        measurements = silhouette_params.get('measurements', {})
        basics = measurements.get('basics', []) if measurements else []
        
        # Extract values
        chest = next((m['value_cm'] for m in basics if m.get('key') == 'chest'), 95)
        waist = next((m['value_cm'] for m in basics if m.get('key') == 'waist'), 80)
        hips = next((m['value_cm'] for m in basics if m.get('key') == 'hips'), 98)
        
        # Compute normalized shape parameters
        beta = [
            round((height_cm - 175) / 15, 3),   # β0: Height
            round((chest - 95) / 15, 3),         # β1: Chest
            round((waist - 80) / 15, 3),         # β2: Waist
            round((hips - 98) / 15, 3),          # β3: Hips
            round((bmi - 22) / 5, 3),            # β4: BMI
            round((chest - waist) / 20, 3),      # β5: V-taper
            round((hips - waist) / 20, 3),       # β6: Hip curve
            0.0,                                  # β7: Reserved
            0.0,                                  # β8: Reserved
            0.0,                                  # β9: Reserved
        ]
        
        return {
            'beta': beta,
            'height_cm': height_cm,
            'weight_kg': weight_kg,
            'bmi': round(bmi, 1)
        }

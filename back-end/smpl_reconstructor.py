"""
SMPL-Inspired Body Reconstructor
Generates realistic 3D body meshes from video using MediaPipe pose estimation
and parametric body modeling based on anthropometric measurements.
"""

import os
import numpy as np
import trimesh
import cv2
import logging
from typing import List, Dict, Tuple, Optional, Any
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)


class ParametricBodyModel:
    """
    Parametric body model inspired by SMPL.
    Generates realistic human meshes from shape parameters (beta).
    """
    
    # Body proportions relative to total height (normalized 0-1)
    BODY_LANDMARKS = {
        'head_top': 1.0,
        'chin': 0.87,
        'neck': 0.82,
        'shoulders': 0.78,
        'chest': 0.68,
        'waist': 0.58,
        'hips': 0.50,
        'crotch': 0.47,
        'mid_thigh': 0.35,
        'knee': 0.27,
        'calf': 0.18,
        'ankle': 0.05,
        'foot': 0.0
    }
    
    def __init__(self, resolution_height: int = 120, resolution_radial: int = 72,
                 smooth_iterations: int = 3):
        self.resolution_height = max(50, resolution_height)
        self.resolution_radial = max(32, resolution_radial)
        self.smooth_iterations = max(0, smooth_iterations)
        
    def generate_mesh(self, 
                      height_cm: float = 175.0,
                      weight_kg: float = 70.0,
                      measurements: Dict = None,
                      gender: str = 'men') -> trimesh.Trimesh:
        """
        Generate a parametric 3D body mesh from measurements.
        
        Args:
            height_cm: Total body height in cm
            weight_kg: Body weight in kg
            measurements: Dict with body measurements
            gender: 'men' or 'women'
            
        Returns:
            trimesh.Trimesh: 3D body mesh
        """
        logger.info(f"Generating parametric body mesh: {height_cm}cm, {weight_kg}kg")
        
        # Extract or estimate measurements
        params = self._extract_body_params(measurements, height_cm, weight_kg, gender)
        
        # Generate body profile (radius at each height level)
        profile = self._generate_body_profile(params, gender)
        
        # Create mesh from profile using revolution/lofting
        mesh = self._create_mesh_from_profile(profile, height_cm)
        
        return mesh
    
    def _extract_body_params(self, measurements: Dict, height_cm: float, 
                            weight_kg: float, gender: str) -> Dict:
        """Extract body parameters from measurements or estimate from BMI."""
        
        bmi = weight_kg / ((height_cm / 100) ** 2)
        bmi_factor = bmi / 22.0  # Normalized to average BMI
        
        # Default parameters based on gender and BMI
        if gender == 'women':
            defaults = {
                'chest': 88 * bmi_factor,
                'waist': 70 * bmi_factor,
                'hips': 98 * bmi_factor,
                'neck': 32 * bmi_factor,
                'thigh': 56 * bmi_factor,
                'shoulder_width': height_cm * 0.23,
                'hip_width': height_cm * 0.19,
            }
        else:  # men
            defaults = {
                'chest': 98 * bmi_factor,
                'waist': 82 * bmi_factor,
                'hips': 95 * bmi_factor,
                'neck': 38 * bmi_factor,
                'thigh': 55 * bmi_factor,
                'shoulder_width': height_cm * 0.26,
                'hip_width': height_cm * 0.17,
            }
        
        # Override with actual measurements if available
        if measurements:
            basics = measurements.get('basics', [])
            for m in basics:
                key = m.get('key', '')
                if key in defaults and m.get('value_cm'):
                    defaults[key] = m['value_cm']
            
            widths = measurements.get('widths', [])
            for m in widths:
                key = m.get('key', '')
                if key == 'shoulders' and m.get('value_cm'):
                    defaults['shoulder_width'] = m['value_cm']
        
        return defaults
    
    def _generate_body_profile(self, params: Dict, gender: str) -> List[Dict]:
        """
        Generate body profile - radius values at different height levels.
        Creates a realistic human silhouette.
        """
        
        # Convert circumferences to radii (circumference = 2 * pi * r)
        def circ_to_radius(circ): 
            return circ / (2 * np.pi)
        
        # Core radii
        chest_r = circ_to_radius(params['chest'])
        waist_r = circ_to_radius(params['waist'])
        hips_r = circ_to_radius(params['hips'])
        neck_r = circ_to_radius(params['neck'])
        thigh_r = circ_to_radius(params['thigh'])
        
        # Build profile points (height_ratio, front_radius, side_radius)
        # Use elliptical cross-sections for realism
        profile = [
            # Feet
            {'h': 0.00, 'rx': 4.5, 'ry': 10.0, 'type': 'foot'},
            {'h': 0.03, 'rx': 4.0, 'ry': 5.0, 'type': 'ankle'},
            {'h': 0.05, 'rx': 4.5, 'ry': 5.5, 'type': 'ankle_top'},
            
            # Calf
            {'h': 0.12, 'rx': thigh_r * 0.55, 'ry': thigh_r * 0.50, 'type': 'lower_calf'},
            {'h': 0.18, 'rx': thigh_r * 0.65, 'ry': thigh_r * 0.60, 'type': 'calf_widest'},
            {'h': 0.24, 'rx': thigh_r * 0.50, 'ry': thigh_r * 0.45, 'type': 'knee'},
            
            # Thigh
            {'h': 0.30, 'rx': thigh_r * 0.75, 'ry': thigh_r * 0.70, 'type': 'lower_thigh'},
            {'h': 0.38, 'rx': thigh_r * 0.95, 'ry': thigh_r * 0.90, 'type': 'mid_thigh'},
            {'h': 0.45, 'rx': thigh_r, 'ry': thigh_r * 0.95, 'type': 'upper_thigh'},
            
            # Hips/Pelvis (critical for shape)
            {'h': 0.48, 'rx': hips_r * 0.95, 'ry': hips_r * 0.75, 'type': 'crotch'},
            {'h': 0.50, 'rx': hips_r, 'ry': hips_r * 0.78, 'type': 'hips'},
            {'h': 0.52, 'rx': hips_r * 0.98, 'ry': hips_r * 0.80, 'type': 'hip_top'},
            
            # Waist
            {'h': 0.56, 'rx': waist_r * 0.95, 'ry': waist_r * 0.85, 'type': 'lower_waist'},
            {'h': 0.58, 'rx': waist_r, 'ry': waist_r * 0.82, 'type': 'waist'},
            {'h': 0.60, 'rx': waist_r * 1.05, 'ry': waist_r * 0.85, 'type': 'upper_waist'},
            
            # Ribcage/Chest
            {'h': 0.64, 'rx': chest_r * 0.90, 'ry': chest_r * 0.70, 'type': 'lower_chest'},
            {'h': 0.68, 'rx': chest_r, 'ry': chest_r * 0.75, 'type': 'chest'},
            {'h': 0.72, 'rx': chest_r * 0.95, 'ry': chest_r * 0.72, 'type': 'upper_chest'},
            
            # Shoulders (widest part for men)
            {'h': 0.76, 'rx': params['shoulder_width'] / 2 * 0.9, 'ry': chest_r * 0.65, 'type': 'shoulder_base'},
            {'h': 0.78, 'rx': params['shoulder_width'] / 2, 'ry': chest_r * 0.55, 'type': 'shoulders'},
            {'h': 0.80, 'rx': params['shoulder_width'] / 2 * 0.75, 'ry': chest_r * 0.45, 'type': 'trapezius'},
            
            # Neck
            {'h': 0.82, 'rx': neck_r * 1.1, 'ry': neck_r * 0.95, 'type': 'neck_base'},
            {'h': 0.85, 'rx': neck_r, 'ry': neck_r * 0.90, 'type': 'neck_mid'},
            {'h': 0.87, 'rx': neck_r * 0.95, 'ry': neck_r * 0.88, 'type': 'neck_top'},
            
            # Head (simplified ellipsoid)
            {'h': 0.88, 'rx': 7.5, 'ry': 8.5, 'type': 'chin'},
            {'h': 0.91, 'rx': 8.5, 'ry': 9.5, 'type': 'jaw'},
            {'h': 0.94, 'rx': 8.0, 'ry': 10.0, 'type': 'face'},
            {'h': 0.97, 'rx': 7.5, 'ry': 9.5, 'type': 'forehead'},
            {'h': 1.00, 'rx': 5.0, 'ry': 6.0, 'type': 'crown'},
        ]
        
        return profile
    
    def _create_mesh_from_profile(self, profile: List[Dict], height_cm: float) -> trimesh.Trimesh:
        """
        Create a humanoid mesh by separating legs and torso.
        Generates 3 sub-meshes (L-Leg, R-Leg, Torso) and combines them.
        """
        height_m = height_cm / 100.0
        n_radial = self.resolution_radial
        
        # Split profile into Legs and Torso
        leg_profile = [p for p in profile if p['h'] < 0.48]
        torso_profile = [p for p in profile if p['h'] >= 0.46] # Overlap at hips
        
        vertices = []
        faces = []
        
        def add_tube(sub_profile, x_offset=0.0):
            start_v_idx = len(vertices)
            
            # Generate rings
            angles = np.linspace(0, 2 * np.pi, n_radial, endpoint=False)
            
            for section in sub_profile:
                h = section['h'] * height_m
                rx = section['rx'] / 100.0
                ry = section['ry'] / 100.0
                
                for angle in angles:
                    x = rx * np.cos(angle) + x_offset
                    z = ry * np.sin(angle)
                    vertices.append([x, h, z])
            
            # Generate faces
            n_sections = len(sub_profile)
            for i in range(n_sections - 1):
                for j in range(n_radial):
                    curr = start_v_idx + i * n_radial + j
                    curr_next = start_v_idx + i * n_radial + (j + 1) % n_radial
                    next_r = start_v_idx + (i + 1) * n_radial + j
                    next_r_next = start_v_idx + (i + 1) * n_radial + (j + 1) % n_radial
                    
                    faces.append([curr, curr_next, next_r])
                    faces.append([curr_next, next_r_next, next_r])
            
            # Cap top/bottom simple
            # (Skipped for cleaner code, holes are hidden by overlap or at ends)
            return len(vertices)

        # 1. Left Leg (Offset -X)
        # Calculate leg offset based on hip width
        hip_width_m = (profile[10]['rx'] / 100.0) * 2  # Approx hip width
        leg_offset = hip_width_m * 0.25
        
        add_tube(leg_profile, -leg_offset)
        
        # 2. Right Leg (Offset +X)
        add_tube(leg_profile, leg_offset)
        
        # 3. Torso (Center)
        add_tube(torso_profile, 0.0)
        
        # Create Trimesh
        # Create Trimesh
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Compute proper normals
        mesh.fix_normals()
        
        # Smoothing pour précision et rendu naturel
        for _ in range(self.smooth_iterations):
            try:
                mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=1, lamb=0.5)
            except Exception:
                break
        
        # Apply skin-like color
        if hasattr(mesh.visual, 'vertex_colors'):
            mesh.visual.vertex_colors = np.full((len(mesh.vertices), 4), [210, 180, 160, 255], dtype=np.uint8)
            
        logger.info(f"Generated mesh: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
        
        return mesh


class SMPLReconstructor:
    """
    Main 3D Body Reconstructor using parametric body model.
    Extracts pose from video frames and generates realistic body mesh.
    """
    
    def __init__(self):
        self.body_model = ParametricBodyModel()
        self.pose_detector = None
        self._init_pose_detector()
        
    def _init_pose_detector(self):
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
                logger.warning(f"Pose model not found: {model_path}")
        except Exception as e:
            logger.error(f"Failed to initialize pose detector: {e}")
    
    def fit(self, frames: List[Dict], height_cm: float = 175.0, 
            weight_kg: float = 70.0, gender: str = 'men',
            output_path: str = None, preset: Any = None) -> Tuple[bool, Optional[str], Dict]:
        """
        Fit body model to video frames. preset: PipelinePreset for mesh res and front_side_frames.
        """
        if preset is not None:
            self.body_model.resolution_height = max(50, getattr(preset, 'mesh_resolution_height', 120))
            self.body_model.resolution_radial = max(32, getattr(preset, 'mesh_resolution_radial', 72))
            self.body_model.smooth_iterations = max(0, getattr(preset, 'mesh_smooth_iterations', 3))
        logger.info("Fitting SMPL-inspired body model (res %d/%d, smooth %d)...",
                    self.body_model.resolution_height, self.body_model.resolution_radial,
                    self.body_model.smooth_iterations)
        
        self.correct_angles(frames)
        pose_analysis = self._analyze_poses(frames)
        front_side_n = getattr(preset, 'front_side_frames', 16) if preset else 16
        silhouette_params = self._analyze_silhouettes(frames, height_cm, front_side_frames=front_side_n)
        
        # Generate mesh
        mesh = self.body_model.generate_mesh(
            height_cm=height_cm,
            weight_kg=weight_kg,
            measurements=silhouette_params.get('measurements'),
            gender=gender
        )
        
        if mesh is None:
            logger.error("Failed to generate mesh")
            return False, None, {}
        
        # Save mesh
        if output_path:
            glb_path = output_path if output_path.endswith('.glb') else output_path.replace('.obj', '.glb')
            try:
                mesh.export(glb_path)
                logger.info(f"Mesh saved to: {glb_path}")
                
                # Generate SMPL-like parameters
                smpl_params = self._compute_shape_params(silhouette_params, height_cm, weight_kg)
                
                return True, glb_path, smpl_params
            except Exception as e:
                logger.error(f"Failed to save mesh: {e}")
                return False, None, {}
        
        return True, None, {}

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

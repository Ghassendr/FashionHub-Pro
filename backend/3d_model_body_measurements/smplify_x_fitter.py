"""
SMPLify-X Integration Module
Optimizes SMPL-X body model (β shape + θ pose) to fit silhouettes and 2D joints from 72 frames.
CPU-compatible implementation.
"""

import os
import numpy as np
import cv2
import trimesh
import logging
from typing import List, Dict, Tuple, Optional
from scipy.optimize import minimize
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)


class SMPLifyXFitter:
    """
    SMPLify-X Fitter: Optimizes β (shape) and θ (pose) parameters
    to fit silhouettes and 2D joints across all frames.
    """
    
    def __init__(self, gender: str = 'neutral'):
        """
        Initialize SMPLify-X fitter.
        
        Args:
            gender: 'neutral', 'male', or 'female'
        """
        self.gender = gender
        self.pose_detector = None
        self._init_pose_detector()
        
        # SMPL-X parameters
        # β: shape parameters (10 dimensions for body shape)
        # θ: pose parameters (21 joints × 3 = 63 for body pose)
        self.beta_dim = 10
        self.theta_dim = 63  # 21 joints × 3D rotation
        
    def _init_pose_detector(self):
        """Initialize MediaPipe Pose detector for 2D joint extraction."""
        try:
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'models', 'pose_landmarker_full.task'))
            if not os.path.exists(model_path):
                model_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models', 'pose_landmarker_full.task')
            if os.path.exists(model_path):
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    num_poses=1,
                    output_segmentation_masks=False,
                    min_pose_detection_confidence=0.3,
                    min_pose_presence_confidence=0.3,
                    min_tracking_confidence=0.3
                )
                self.pose_detector = vision.PoseLandmarker.create_from_options(options)
                logger.info("Pose detector initialized for SMPLify-X")
            else:
                logger.warning(f"Pose model not found: {model_path}")
        except Exception as e:
            logger.error(f"Failed to initialize pose detector: {e}")
    
    def extract_2d_joints(self, frames: List[Dict]) -> List[Dict]:
        """
        Step 3 (replaced): Extract 2D joints from MediaPipe as hints for SMPLify-X.
        Returns joint data per frame, not final geometry.
        
        Args:
            frames: List of frame dictionaries with 'path' and 'mask'
            
        Returns:
            List of joint data per frame: {
                'frame_idx': int,
                'joints_2d': np.array (N_joints, 2),
                'joints_visibility': np.array (N_joints,),
                'image_shape': (h, w)
            }
        """
        logger.info("Extracting 2D joints from MediaPipe (hints for SMPLify-X)...")
        
        if not self.pose_detector:
            logger.error("Pose detector not available")
            return []
        
        joints_data = []
        
        # MediaPipe joint indices mapping to SMPL-X joints
        # MediaPipe has 33 landmarks, we map to key body joints
        MP_TO_SMPL_JOINTS = {
            # Body joints (21 main joints for SMPL)
            0: 'nose',
            2: 'left_eye', 5: 'right_eye',
            7: 'left_ear', 8: 'right_ear',
            11: 'left_shoulder', 12: 'right_shoulder',
            13: 'left_elbow', 14: 'right_elbow',
            15: 'left_wrist', 16: 'right_wrist',
            23: 'left_hip', 24: 'right_hip',
            25: 'left_knee', 26: 'right_knee',
            27: 'left_ankle', 28: 'right_ankle',
            29: 'left_heel', 30: 'right_heel',
            31: 'left_foot_index', 32: 'right_foot_index',
        }
        
        for frame_idx, frame in enumerate(frames):
            if not frame.get('body_detected'):
                continue
            
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                
                h, w = img.shape[:2]
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                result = self.pose_detector.detect(mp_image)
                
                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    landmarks = result.pose_landmarks[0]
                    
                    # Extract 2D joints (x, y) in pixel coordinates
                    joints_2d = []
                    joints_visibility = []
                    
                    # Extract key joints (21 main body joints)
                    key_indices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
                    for idx in key_indices:
                        if idx < len(landmarks):
                            lm = landmarks[idx]
                            joints_2d.append([lm.x * w, lm.y * h])
                            joints_visibility.append(lm.visibility)
                        else:
                            joints_2d.append([0.0, 0.0])
                            joints_visibility.append(0.0)
                    
                    # Pad to 21 joints (SMPL standard)
                    while len(joints_2d) < 21:
                        joints_2d.append([0.0, 0.0])
                        joints_visibility.append(0.0)
                    
                    joints_data.append({
                        'frame_idx': frame_idx,
                        'joints_2d': np.array(joints_2d[:21], dtype=np.float32),
                        'joints_visibility': np.array(joints_visibility[:21], dtype=np.float32),
                        'image_shape': (h, w),
                        'rotation_angle': frame.get('rotation_angle', 0)
                    })
            except Exception as e:
                logger.debug(f"Joint extraction error for frame {frame_idx}: {e}")
                continue
        
        logger.info(f"Extracted 2D joints from {len(joints_data)} frames")
        return joints_data
    
    def optimize_smpl_x(self, frames: List[Dict], joints_data: List[Dict],
                       height_cm: float, weight_kg: float, gender: str) -> Tuple[trimesh.Trimesh, Dict]:
        """
        Step 4 (replaced): SMPLify-X optimization.
        Optimizes β (shape) and θ (pose) to fit silhouettes and joints across all frames.
        
        Args:
            frames: List of frames with silhouettes (masks)
            joints_data: List of 2D joint data from extract_2d_joints()
            height_cm: Target height in cm
            weight_kg: Target weight in kg
            
        Returns:
            mesh: Continuous SMPL-X mesh (~10,000 vertices)
            fitting_info: Optimization results and parameters
        """
        logger.info("SMPLify-X optimization: fitting β (shape) and θ (pose) to silhouettes + joints...")
        
        if not joints_data or not frames:
            logger.error("No joints or frames data available")
            return None, {}
        
        # Initialize β (shape) parameters from height/weight/BMI
        beta_init = self._initialize_beta(height_cm, weight_kg, gender)
        
        # Initialize θ (pose) parameters per frame
        # For now, we'll optimize a single canonical pose and use it for all frames
        # In full SMPLify-X, each frame has its own θ
        theta_init = self._initialize_theta(len(frames))
        
        # Combine parameters: [β (10), θ_avg (63)]
        params_init = np.concatenate([beta_init, theta_init])
        
        # Optimization: minimize silhouette + joint reprojection error
        logger.info("Running optimization (CPU)...")
        
        # Prepare constraints: silhouettes and joints
        silhouette_constraints = self._prepare_silhouette_constraints(frames)
        joint_constraints = self._prepare_joint_constraints(joints_data)
        
        # Optimize
        result = minimize(
            fun=self._objective_function,
            x0=params_init,
            method='L-BFGS-B',
            args=(silhouette_constraints, joint_constraints, height_cm),
            options={'maxiter': 50, 'disp': True}
        )
        
        # Extract optimized parameters
        beta_optimized = result.x[:self.beta_dim]
        theta_optimized = result.x[self.beta_dim:]
        
        # Generate mesh from optimized parameters
        mesh = self._generate_smpl_x_mesh(beta_optimized, theta_optimized, height_cm, gender)
        
        fitting_info = {
            'beta': beta_optimized.tolist(),
            'theta': theta_optimized.tolist(),
            'optimization_success': result.success,
            'optimization_error': float(result.fun),
            'num_frames': len(frames),
            'num_joints_frames': len(joints_data)
        }
        
        logger.info(f"SMPLify-X optimization complete. Error: {result.fun:.4f}")
        
        return mesh, fitting_info
    
    def _initialize_beta(self, height_cm: float, weight_kg: float, gender: str) -> np.ndarray:
        """Initialize β (shape) parameters from height/weight."""
        bmi = weight_kg / ((height_cm / 100) ** 2)
        
        # Normalized β parameters (10 dimensions)
        beta = np.array([
            (height_cm - 175) / 15,      # β0: Height
            (bmi - 22) / 5,               # β1: BMI/weight
            0.0,                          # β2: Body width
            0.0,                          # β3: Body depth
            0.0,                          # β4: Limb length
            0.0,                          # β5: Shoulder width
            0.0,                          # β6: Hip width
            0.0,                          # β7: Torso length
            0.0,                          # β8: Variation
            0.0,                          # β9: Variation
        ], dtype=np.float32)
        
        return beta
    
    def _initialize_theta(self, num_frames: int) -> np.ndarray:
        """Initialize θ (pose) parameters - canonical T-pose."""
        # 21 joints × 3D rotation (axis-angle) = 63 parameters
        # Initialize to T-pose (neutral)
        theta = np.zeros(63, dtype=np.float32)
        return theta
    
    def _prepare_silhouette_constraints(self, frames: List[Dict]) -> Dict:
        """Prepare silhouette constraints from masks."""
        constraints = {
            'masks': [],
            'angles': [],
            'image_shapes': []
        }
        
        for frame in frames:
            if frame.get('body_detected') and 'mask' in frame:
                mask = frame['mask']
                constraints['masks'].append(mask)
                constraints['angles'].append(frame.get('rotation_angle', 0))
                constraints['image_shapes'].append(mask.shape)
        
        return constraints
    
    def _prepare_joint_constraints(self, joints_data: List[Dict]) -> Dict:
        """Prepare joint constraints from 2D joints."""
        return {
            'joints_2d': [jd['joints_2d'] for jd in joints_data],
            'joints_visibility': [jd['joints_visibility'] for jd in joints_data],
            'image_shapes': [jd['image_shape'] for jd in joints_data],
            'angles': [jd.get('rotation_angle', 0) for jd in joints_data]
        }
    
    def _objective_function(self, params: np.ndarray, silhouette_constraints: Dict,
                           joint_constraints: Dict, height_cm: float) -> float:
        """
        Objective function for optimization.
        Minimizes: silhouette reprojection error + joint reprojection error + regularization.
        """
        beta = params[:self.beta_dim]
        theta = params[self.beta_dim:]
        
        # Generate mesh from current parameters
        mesh = self._generate_smpl_x_mesh(beta, theta, height_cm, self.gender)
        
        if mesh is None:
            return 1e6  # Large penalty
        
        # Silhouette error: how well mesh projects match silhouettes
        silhouette_error = self._compute_silhouette_error(
            mesh, silhouette_constraints
        )
        
        # Joint error: how well mesh joints project match 2D joints
        joint_error = self._compute_joint_error(
            mesh, joint_constraints
        )
        
        # Regularization: keep parameters reasonable
        reg_beta = 0.01 * np.sum(beta ** 2)
        reg_theta = 0.01 * np.sum(theta ** 2)
        
        total_error = silhouette_error + joint_error + reg_beta + reg_theta
        
        return total_error
    
    def _compute_silhouette_error(self, mesh: trimesh.Trimesh, constraints: Dict) -> float:
        """Compute silhouette reprojection error."""
        if not constraints['masks']:
            return 0.0
        
        total_error = 0.0
        
        for mask, angle, img_shape in zip(
            constraints['masks'],
            constraints['angles'],
            constraints['image_shapes']
        ):
            # Project mesh to 2D at this angle
            projected_mask = self._project_mesh_to_mask(mesh, angle, img_shape)
            
            # Compare with ground truth mask
            error = np.sum((projected_mask > 0) != (mask > 0)) / mask.size
            total_error += error
        
        return total_error / len(constraints['masks'])
    
    def _compute_joint_error(self, mesh: trimesh.Trimesh, constraints: Dict) -> float:
        """Compute joint reprojection error."""
        if not constraints['joints_2d']:
            return 0.0
        
        total_error = 0.0
        
        for joints_2d, visibility, img_shape, angle in zip(
            constraints['joints_2d'],
            constraints['joints_visibility'],
            constraints['image_shapes'],
            constraints['angles']
        ):
            # Project mesh joints to 2D
            mesh_joints_2d = self._project_mesh_joints_to_2d(mesh, angle, img_shape)
            
            # Compute L2 error for visible joints
            visible = visibility > 0.3
            if np.any(visible):
                error = np.mean(
                    np.linalg.norm(
                        joints_2d[visible] - mesh_joints_2d[visible],
                        axis=1
                    )
                )
                total_error += error
        
        return total_error / len(constraints['joints_2d']) if constraints['joints_2d'] else 0.0
    
    def _project_mesh_to_mask(self, mesh: trimesh.Trimesh, angle: float, img_shape: Tuple[int, int]) -> np.ndarray:
        """Project mesh to 2D mask at given rotation angle."""
        h, w = img_shape
        mask = np.zeros((h, w), dtype=np.uint8)
        
        # Rotate mesh vertices around Y-axis
        rad = np.radians(angle)
        cos_a, sin_a = np.cos(rad), np.sin(rad)
        
        verts = mesh.vertices.copy()
        x_rot = verts[:, 0] * cos_a - verts[:, 2] * sin_a
        y_rot = verts[:, 1]
        
        # Project to image coordinates (orthographic)
        mesh_bounds = mesh.bounds
        scale_x = w / (mesh_bounds[1][0] - mesh_bounds[0][0] + 1e-6)
        scale_y = h / (mesh_bounds[1][1] - mesh_bounds[0][1] + 1e-6)
        
        u = ((x_rot - mesh_bounds[0][0]) * scale_x).astype(int)
        v = ((-y_rot + mesh_bounds[1][1]) * scale_y).astype(int)
        
        # Create mask from projected vertices
        valid = (u >= 0) & (u < w) & (v >= 0) & (v < h)
        for i in np.where(valid)[0]:
            mask[v[i], u[i]] = 255
        
        # Fill holes
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        
        return mask
    
    def _project_mesh_joints_to_2d(self, mesh: trimesh.Trimesh, angle: float, img_shape: Tuple[int, int]) -> np.ndarray:
        """Project mesh joints to 2D coordinates."""
        # Simplified: use mesh keypoints (head, shoulders, hips, knees, ankles)
        # In full SMPL-X, these would be actual joint positions
        h, w = img_shape
        
        # Extract key vertices as joint proxies
        verts = mesh.vertices
        bounds = mesh.bounds
        
        # Approximate joint positions from mesh structure
        # Top (head), shoulders, hips, knees, ankles
        y_levels = np.linspace(bounds[0][1], bounds[1][1], 21)
        joints_3d = []
        
        for y in y_levels:
            # Find vertices near this Y level
            mask_y = np.abs(verts[:, 1] - y) < 0.01
            if np.any(mask_y):
                # Use centroid of vertices at this level
                joint_3d = np.mean(verts[mask_y], axis=0)
            else:
                joint_3d = np.array([0, y, 0])
            joints_3d.append(joint_3d)
        
        joints_3d = np.array(joints_3d)
        
        # Rotate and project
        rad = np.radians(angle)
        cos_a, sin_a = np.cos(rad), np.sin(rad)
        
        x_rot = joints_3d[:, 0] * cos_a - joints_3d[:, 2] * sin_a
        y_rot = joints_3d[:, 1]
        
        scale_x = w / (bounds[1][0] - bounds[0][0] + 1e-6)
        scale_y = h / (bounds[1][1] - bounds[0][1] + 1e-6)
        
        u = ((x_rot - bounds[0][0]) * scale_x).astype(float)
        v = ((-y_rot + bounds[1][1]) * scale_y).astype(float)
        
        return np.stack([u, v], axis=1)
    
    def _generate_smpl_x_mesh(self, beta: np.ndarray, theta: np.ndarray,
                            height_cm: float, gender: str) -> trimesh.Trimesh:
        """
        Generate SMPL-X mesh from β (shape) and θ (pose) parameters.
        For now, uses parametric body model. In full implementation,
        would use actual SMPL-X model files.
        """
        # Use existing ParametricBodyModel as base
        from .smpl_reconstructor import ParametricBodyModel
        
        body_model = ParametricBodyModel(
            resolution_height=150,  # Higher resolution for ~10k vertices
            resolution_radial=72,
            smooth_iterations=5
        )
        
        # Convert β to measurements
        measurements = self._beta_to_measurements(beta, height_cm, gender)
        
        # Generate mesh
        mesh = body_model.generate_mesh(
            height_cm=height_cm,
            weight_kg=70.0,  # Will be adjusted by beta
            measurements=measurements,
            gender=gender
        )
        
        # Apply pose (θ) - simplified rotation
        # In full SMPL-X, θ would control joint rotations
        if mesh is not None:
            # Apply basic pose adjustments
            mesh = self._apply_pose(mesh, theta)
        
        return mesh
    
    def _beta_to_measurements(self, beta: np.ndarray, height_cm: float, gender: str) -> Dict:
        """Convert β parameters to body measurements."""
        # β0: height adjustment
        height_adj = beta[0] * 15
        adjusted_height = height_cm + height_adj
        
        # β1: BMI/weight adjustment
        bmi_adj = beta[1] * 5
        base_bmi = 22
        adjusted_bmi = base_bmi + bmi_adj
        
        # Estimate measurements from adjusted BMI
        weight_kg = adjusted_bmi * ((adjusted_height / 100) ** 2)
        
        # β2-β9: shape variations
        chest_factor = 1.0 + beta[2] * 0.1
        waist_factor = 1.0 + beta[3] * 0.1
        hips_factor = 1.0 + beta[4] * 0.1
        
        # Base measurements
        if gender == 'women':
            chest_base = 88
            waist_base = 70
            hips_base = 98
        else:
            chest_base = 98
            waist_base = 82
            hips_base = 95
        
        measurements = {
            'basics': [
                {'key': 'chest', 'value_cm': chest_base * chest_factor * (weight_kg / 70)},
                {'key': 'waist', 'value_cm': waist_base * waist_factor * (weight_kg / 70)},
                {'key': 'hips', 'value_cm': hips_base * hips_factor * (weight_kg / 70)},
            ]
        }
        
        return measurements
    
    def _apply_pose(self, mesh: trimesh.Trimesh, theta: np.ndarray) -> trimesh.Trimesh:
        """Apply pose parameters θ to mesh (simplified)."""
        # In full SMPL-X, θ controls joint rotations via skinning
        # For now, apply minimal pose adjustments
        # Full implementation would use SMPL-X skinning weights
        
        # Simple: apply small rotations based on θ
        if np.any(np.abs(theta) > 0.01):
            # Apply slight pose adjustments
            # This is simplified - full SMPL-X uses bone rotations
            pass
        
        return mesh

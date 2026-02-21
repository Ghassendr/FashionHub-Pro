"""
HMRMamba Estimator — Extract pose (θ) and shape (β) from video frames.

Uses HMR2.0 / HMRMamba when available, falls back to MediaPipe-based
estimation for environments without the research model installed.

Outputs: per-frame poses (θ), shape parameters (β), camera parameters.
All saved as checkpoint 'hmr_output.npz'.
"""

import os
import logging
import numpy as np
from typing import List, Dict, Optional

from .checkpoint_manager import (
    save_checkpoint, load_checkpoint, checkpoint_exists, vram_cleanup, get_device
)

logger = logging.getLogger(__name__)


class HMRMambaEstimator:
    """
    Module 2 of the hybrid pipeline.

    Extracts SMPL-X compatible pose and shape parameters from video frames.
    Strategy:
      1. Try loading HMRMamba / HMR2.0 (research model)
      2. Fallback: use MediaPipe Pose to estimate approximate β from 2D landmarks
    """

    def __init__(self):
        self.device = get_device()
        self._model = None
        self._use_fallback = False
        self._init_model()

    def _init_model(self):
        """Try to load HMRMamba. Gracefully degrade to fallback."""
        try:
            import torch
            # Try HMR2.0 / HMRMamba
            # These are research models; import paths may vary
            try:
                from hmr2.models import HMR2
                self._model = HMR2.from_pretrained().to(self.device)
                self._model.eval()
                logger.info("HMRMamba: loaded HMR2 model on %s", self.device)
                return
            except ImportError:
                pass

            try:
                from hmmr.models import HMMR
                self._model = HMMR.from_pretrained().to(self.device)
                self._model.eval()
                logger.info("HMRMamba: loaded HMMR model on %s", self.device)
                return
            except ImportError:
                pass

            logger.warning("HMRMamba: no research model found — using MediaPipe fallback")
            self._use_fallback = True

        except ImportError:
            logger.warning("HMRMamba: PyTorch not available — using MediaPipe fallback")
            self._use_fallback = True

    def estimate(self, frame_paths: List[str], checkpoint_dir: str) -> Dict:
        """
        Estimate pose and shape parameters from video frames.

        Args:
            frame_paths: List of absolute paths to JPEG frame images.
            checkpoint_dir: Directory for checkpoint save/load.

        Returns:
            Dict with keys:
              - betas: np.ndarray shape (N, 10) — shape params per frame
              - poses: np.ndarray shape (N, 72) — pose params per frame (axis-angle)
              - cameras: np.ndarray shape (N, 3) — weak-perspective camera [s, tx, ty]
              - joints_2d: np.ndarray shape (N, J, 2) — 2D joint projections
              - method: str — 'hmrmamba' or 'mediapipe_fallback'
        """
        # ── Check cached ──
        cached = load_checkpoint("hmr_output", checkpoint_dir)
        if cached is not None:
            logger.info("HMRMambaEstimator: using cached result (%d frames)", len(cached.get('betas', [])))
            return cached

        if self._use_fallback:
            result = self._estimate_mediapipe(frame_paths)
        else:
            result = self._estimate_hmr(frame_paths)

        save_checkpoint(result, "hmr_output", checkpoint_dir)
        vram_cleanup()
        return result

    def _estimate_hmr(self, frame_paths: List[str]) -> Dict:
        """Run HMR2/HMRMamba inference on frames."""
        import torch
        import cv2

        all_betas = []
        all_poses = []
        all_cameras = []
        all_joints = []

        for i, fpath in enumerate(frame_paths):
            img = cv2.imread(fpath)
            if img is None:
                continue

            # Preprocess for HMR (normalize, resize to 224x224)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (224, 224))
            img_tensor = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
            img_tensor = img_tensor.unsqueeze(0).to(self.device)

            with torch.no_grad():
                output = self._model(img_tensor)

            betas = output['pred_shape'].cpu().numpy().squeeze()  # (10,)
            poses = output['pred_pose'].cpu().numpy().squeeze()   # (72,)
            camera = output['pred_cam'].cpu().numpy().squeeze()   # (3,)

            all_betas.append(betas)
            all_poses.append(poses)
            all_cameras.append(camera)

            if 'pred_joints_2d' in output:
                all_joints.append(output['pred_joints_2d'].cpu().numpy().squeeze())

            if (i + 1) % 20 == 0:
                logger.info("HMR inference: %d/%d frames", i + 1, len(frame_paths))
                vram_cleanup()

        return {
            'betas': np.array(all_betas),
            'poses': np.array(all_poses),
            'cameras': np.array(all_cameras) if all_cameras else np.zeros((len(all_betas), 3)),
            'joints_2d': np.array(all_joints) if all_joints else np.zeros((len(all_betas), 17, 2)),
            'method': 'hmrmamba',
        }

    def _estimate_mediapipe(self, frame_paths: List[str]) -> Dict:
        """
        Fallback: Use MediaPipe Pose to estimate approximate shape params.

        MediaPipe gives 33 2D/3D landmarks. We derive β-like shape parameters
        from body proportions (limb lengths, shoulder/hip widths).
        """
        import cv2
        import mediapipe as mp_mod

        mp_pose = mp_mod.solutions.pose
        pose_detector = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            min_detection_confidence=0.5,
        )

        all_betas = []
        all_poses = []
        all_joints_2d = []

        for i, fpath in enumerate(frame_paths):
            img = cv2.imread(fpath)
            if img is None:
                continue
            h, w = img.shape[:2]

            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            result = pose_detector.process(img_rgb)

            if result.pose_landmarks is None:
                # No detection — insert zeros
                all_betas.append(np.zeros(10))
                all_poses.append(np.zeros(72))
                all_joints_2d.append(np.zeros((33, 2)))
                continue

            lm = result.pose_landmarks.landmark

            # Extract 2D joints
            joints_2d = np.array([[l.x * w, l.y * h] for l in lm])  # (33, 2)
            all_joints_2d.append(joints_2d)

            # ── Derive approximate β from proportions ──
            beta = self._landmarks_to_beta(lm, h, w)
            all_betas.append(beta)

            # ── Derive approximate pose (axis-angle) ──
            pose = self._landmarks_to_pose(lm)
            all_poses.append(pose)

        pose_detector.close()

        return {
            'betas': np.array(all_betas) if all_betas else np.zeros((1, 10)),
            'poses': np.array(all_poses) if all_poses else np.zeros((1, 72)),
            'cameras': np.zeros((len(all_betas), 3)),
            'joints_2d': np.array(all_joints_2d) if all_joints_2d else np.zeros((1, 33, 2)),
            'method': 'mediapipe_fallback',
        }

    @staticmethod
    def _landmarks_to_beta(landmarks, img_h, img_w):
        """
        Convert MediaPipe 33-landmark set to 10 approximate β shape params.

        β mapping (SMPL convention, approximate):
          β[0] = overall body size (height proxy)
          β[1] = shoulder width / hip width ratio
          β[2] = torso length ratio
          β[3] = leg length ratio
          β[4] = arm length ratio
          β[5] = body thickness (depth proxy from landmark z)
          β[6..9] = higher-order shape variation (set to 0)
        """
        lm = landmarks

        def dist(a, b):
            return np.sqrt((lm[a].x - lm[b].x)**2 + (lm[a].y - lm[b].y)**2)

        def dist_z(a, b):
            return abs(lm[a].z - lm[b].z)

        # Body height (top head to ankle midpoint)
        body_height = abs(lm[0].y - (lm[27].y + lm[28].y) / 2)

        # Shoulder width (normalized)
        shoulder_w = dist(11, 12)

        # Hip width (normalized)
        hip_w = dist(23, 24)

        # Torso length (shoulder midpoint to hip midpoint)
        torso_len = abs((lm[11].y + lm[12].y) / 2 - (lm[23].y + lm[24].y) / 2)

        # Leg length (hip to ankle)
        leg_len = (dist(23, 27) + dist(24, 28)) / 2

        # Arm length (shoulder to wrist)
        arm_len = (dist(11, 15) + dist(12, 16)) / 2

        # Depth proxy from z coordinates
        body_depth = np.mean([abs(lm[i].z) for i in [11, 12, 23, 24]])

        beta = np.zeros(10)
        beta[0] = (body_height - 0.5) * 4.0  # Centered around typical body_height ~0.5
        beta[1] = (shoulder_w / max(hip_w, 0.01) - 1.2) * 3.0  # Shoulder/hip ratio
        beta[2] = (torso_len / max(body_height, 0.01) - 0.3) * 5.0  # Torso proportion
        beta[3] = (leg_len / max(body_height, 0.01) - 0.45) * 5.0  # Leg proportion
        beta[4] = (arm_len / max(body_height, 0.01) - 0.35) * 5.0  # Arm proportion
        beta[5] = body_depth * 5.0  # Depth
        # β[6..9] remain 0 — higher-order not estimated from 2D

        return beta

    @staticmethod
    def _landmarks_to_pose(landmarks):
        """
        Convert MediaPipe landmarks to approximate SMPL axis-angle pose.

        Returns 72-dim vector (24 joints × 3 axis-angle).
        MediaPipe has 33 landmarks; we map the relevant ones to SMPL's 24 joints.
        """
        # SMPL joint mapping from MediaPipe indices (approximate)
        # 0: pelvis, 1: left_hip, 2: right_hip, 3: spine1, ...
        # For fallback we just store the landmark positions as-is
        # and let SMPLFitter handle the proper conversion.
        pose = np.zeros(72)

        lm = landmarks
        # Store key joint angles as simple rotations
        # This is a coarse approximation — the real HMR model does this properly

        # Pelvis orientation (from hip landmarks)
        hip_l = np.array([lm[23].x, lm[23].y, lm[23].z])
        hip_r = np.array([lm[24].x, lm[24].y, lm[24].z])
        pelvis_dir = hip_r - hip_l
        pelvis_angle = np.arctan2(pelvis_dir[2], pelvis_dir[0])
        pose[0] = 0  # pelvis x-rotation
        pose[1] = pelvis_angle  # pelvis y-rotation
        pose[2] = 0  # pelvis z-rotation

        return pose

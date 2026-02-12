"""
Video Overlay Module
Superpose le modèle 3D sur la vidéo pour validation visuelle.
"""

import os
import cv2
import numpy as np
import trimesh
import logging
from typing import List, Dict, Tuple, Optional
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)


class VideoOverlayRenderer:
    """Rend le modèle 3D superposé sur les frames vidéo pour validation."""
    
    def __init__(self):
        self.pose_detector = None
        self._init_pose_detector()
    
    def _init_pose_detector(self):
        """Initialise MediaPipe Pose pour projeter le mesh."""
        try:
            model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'models', 'pose_landmarker_full.task'))
            if not os.path.exists(model_path):
                model_path = os.path.abspath('models/pose_landmarker_full.task')
            if os.path.exists(model_path):
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.PoseLandmarkerOptions(
                    base_options=base_options,
                    num_poses=1,
                    min_pose_detection_confidence=0.3,
                    min_pose_presence_confidence=0.3,
                    min_tracking_confidence=0.3,
                    output_segmentation_masks=True
                )
                self.pose_detector = vision.PoseLandmarker.create_from_options(options)
                logger.info("Pose detector initialized for overlay")
        except Exception as e:
            logger.warning(f"Pose detector not available for overlay: {e}")
    
    def render_overlay(self, mesh: trimesh.Trimesh, frames: List[Dict],
                      output_dir: str, height_cm: float) -> str:
        """
        Superpose le mesh 3D sur les frames vidéo.
        
        Returns:
            Path to output video with overlay
        """
        logger.info("Rendering 3D model overlay on video frames...")
        
        if not self.pose_detector or not frames:
            logger.warning("Cannot render overlay: missing detector or frames")
            return None
        
        overlay_frames_dir = os.path.join(output_dir, 'overlay_frames')
        os.makedirs(overlay_frames_dir, exist_ok=True)
        
        overlay_frames = []
        valid_count = 0
        
        for frame in frames:
            if not frame.get('body_detected'):
                continue
            
            try:
                img = cv2.imread(frame['path'])
                if img is None:
                    continue
                
                # Détecter pose pour obtenir la transformation caméra
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
                result = self.pose_detector.detect(mp_image)
                
                if not result.pose_landmarks or len(result.pose_landmarks) == 0:
                    continue
                
                landmarks = result.pose_landmarks[0]
                
                # Projeter le mesh sur l'image
                overlay_img = self._project_mesh_on_frame(mesh, img, landmarks, height_cm)
                
                # Sauvegarder frame avec overlay
                frame_path = os.path.join(overlay_frames_dir, f"overlay_{frame.get('frame_number', 0):03d}.jpg")
                cv2.imwrite(frame_path, overlay_img)
                overlay_frames.append(frame_path)
                valid_count += 1
                
            except Exception as e:
                logger.debug(f"Overlay rendering error: {e}")
                continue
        
        if not overlay_frames:
            logger.warning("No overlay frames generated")
            return None
        
        # Créer vidéo depuis les frames
        video_path = self._create_overlay_video(overlay_frames, output_dir, frames[0].get('width', 512), frames[0].get('height', 512))
        
        logger.info(f"Generated overlay video with {valid_count} frames")
        return video_path
    
    def _project_mesh_on_frame(self, mesh: trimesh.Trimesh, frame_img: np.ndarray,
                               landmarks: List, height_cm: float) -> np.ndarray:
        """
        Projette le mesh 3D sur la frame en utilisant les landmarks pour la transformation.
        """
        h, w = frame_img.shape[:2]
        overlay_img = frame_img.copy()
        
        # Extraire points clés des landmarks
        nose = landmarks[0]
        l_shoulder = landmarks[11]
        r_shoulder = landmarks[12]
        l_hip = landmarks[23]
        r_hip = landmarks[24]
        l_ankle = landmarks[27]
        r_ankle = landmarks[28]
        
        # Calculer transformation caméra approximative depuis les landmarks
        # On utilise une projection orthographique simplifiée
        
        # Points 3D du mesh (normalisés)
        mesh_verts = mesh.vertices.copy()
        
        # Centrer et normaliser
        mesh_center = mesh_verts.mean(axis=0)
        mesh_verts -= mesh_center
        
        # Scale pour correspondre à la taille réelle
        mesh_height_3d = mesh_verts[:, 1].max() - mesh_verts[:, 1].min()
        if mesh_height_3d > 0:
            landmark_height_px = abs((l_ankle.y + r_ankle.y) / 2 * h - (nose.y * h))
            scale_3d_to_2d = landmark_height_px / (mesh_height_3d * (height_cm / 100))
            mesh_verts *= scale_3d_to_2d
        
        # Rotation approximative depuis l'angle de vue (utiliser angle de frame si disponible)
        # Pour simplifier, on projette en vue frontale
        
        # Projection orthographique sur le plan XY
        # X: gauche-droite, Y: haut-bas (inversé en image)
        projected_2d = np.zeros((len(mesh_verts), 2))
        projected_2d[:, 0] = mesh_verts[:, 0] + w / 2  # X centré
        projected_2d[:, 1] = -mesh_verts[:, 1] + h / 2  # Y inversé et centré
        
        # Dessiner le contour du mesh
        # Utiliser les faces pour dessiner les arêtes
        for face in mesh.faces[:min(500, len(mesh.faces))]:  # Limiter pour performance
            pts = projected_2d[face].astype(int)
            # Vérifier que les points sont dans l'image
            valid = np.all((pts >= 0) & (pts < [w, h]), axis=1)
            if np.all(valid):
                cv2.polylines(overlay_img, [pts], True, (0, 255, 0), 1)
        
        # Dessiner les landmarks MediaPipe pour référence
        landmark_points = [
            (int(nose.x * w), int(nose.y * h)),
            (int(l_shoulder.x * w), int(l_shoulder.y * h)),
            (int(r_shoulder.x * w), int(r_shoulder.y * h)),
            (int(l_hip.x * w), int(l_hip.y * h)),
            (int(r_hip.x * w), int(r_hip.y * h)),
        ]
        for pt in landmark_points:
            cv2.circle(overlay_img, pt, 5, (255, 0, 0), -1)
        
        # Dessiner les connexions principales
        connections = [
            (landmark_points[0], landmark_points[1]),  # nose -> l_shoulder
            (landmark_points[0], landmark_points[2]),  # nose -> r_shoulder
            (landmark_points[1], landmark_points[2]),  # l_shoulder -> r_shoulder
            (landmark_points[1], landmark_points[3]),  # l_shoulder -> l_hip
            (landmark_points[2], landmark_points[4]),  # r_shoulder -> r_hip
            (landmark_points[3], landmark_points[4]),  # l_hip -> r_hip
        ]
        for pt1, pt2 in connections:
            cv2.line(overlay_img, pt1, pt2, (0, 0, 255), 2)
        
        return overlay_img
    
    def _create_overlay_video(self, frame_paths: List[str], output_dir: str,
                              width: int, height: int, fps: float = 15.0) -> str:
        """Crée une vidéo depuis les frames avec overlay."""
        if not frame_paths:
            return None
        
        video_path = os.path.join(output_dir, 'model_overlay.mp4')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
        
        for frame_path in sorted(frame_paths):
            frame = cv2.imread(frame_path)
            if frame is not None:
                if frame.shape[:2] != (height, width):
                    frame = cv2.resize(frame, (width, height))
                out.write(frame)
        
        out.release()
        logger.info(f"Overlay video saved: {video_path}")
        return video_path

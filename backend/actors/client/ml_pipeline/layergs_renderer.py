"""
LayerGS Renderer — Gaussian Splatting initialization from DressRecon mesh.

Uses Layer Gaussian Splatting when available, falls back to vertex-based
texture baking from the video frames.

Output: layergs_model.npz checkpoint.
"""

import os
import logging
import numpy as np
from typing import Dict, List, Optional

from .checkpoint_manager import save_checkpoint, load_checkpoint, vram_cleanup, get_device

logger = logging.getLogger(__name__)


class LayerGSRenderer:
    """
    Branch B — Step 1.

    Initializes Gaussian Splatting from the DressRecon mesh vertices
    and optimizes against the video frames for realistic appearance.
    
    Fallback: simple vertex-color texture baking from nearest-view frames.
    """

    def __init__(self):
        self.device = get_device()
        self._use_fallback = False
        self._init_model()

    def _init_model(self):
        """Try to load LayerGS."""
        try:
            from layergs import LayerGaussianSplatting
            self._model = LayerGaussianSplatting()
            logger.info("LayerGS: model loaded")
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning("LayerGS: load error: %s", e)

        self._use_fallback = True
        logger.info("LayerGS: using vertex-color texture fallback")

    def render(self, body_mesh: Dict, frame_paths: List[str],
               checkpoint_dir: str) -> Dict:
        """
        Create textured representation of the body.

        Args:
            body_mesh: Output from DressReconExtractor
            frame_paths: Video frame paths
            checkpoint_dir: Checkpoint directory

        Returns:
            Dict with keys:
              - vertices: np.ndarray (V, 3)
              - faces: np.ndarray (F, 3)
              - vertex_colors: np.ndarray (V, 4) — RGBA per vertex
              - gaussians: dict (if LayerGS available) — GS representation
              - method: str
        """
        cached = load_checkpoint("layergs_model", checkpoint_dir)
        if cached is not None:
            logger.info("LayerGSRenderer: using cached result")
            return cached

        if self._use_fallback:
            result = self._render_fallback(body_mesh, frame_paths)
        else:
            result = self._render_layergs(body_mesh, frame_paths)

        save_checkpoint(result, "layergs_model", checkpoint_dir)
        vram_cleanup()
        return result

    def _render_layergs(self, body_mesh: Dict, frame_paths: List[str]) -> Dict:
        """Run LayerGS optimization."""
        import torch
        import cv2

        vertices = body_mesh['vertices']
        faces = body_mesh['faces']

        # Initialize Gaussians from mesh vertices
        gaussians = {
            'positions': vertices.copy(),
            'scales': np.ones((len(vertices), 3)) * 0.005,
            'rotations': np.tile(np.array([1, 0, 0, 0]), (len(vertices), 1)),  # Identity quat
            'opacities': np.ones(len(vertices)),
            'colors': np.ones((len(vertices), 3)) * 0.5,
        }

        # Load a subset of frames for optimization
        frames_data = []
        for fpath in frame_paths[:20]:
            img = cv2.imread(fpath)
            if img is not None:
                frames_data.append(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

        if frames_data:
            # Run LayerGS optimization
            gs_result = self._model.optimize(
                gaussians, frames_data,
                iterations=500,
                device=self.device,
            )
            gaussians.update(gs_result)

        return {
            'vertices': vertices,
            'faces': faces,
            'vertex_colors': self._gaussians_to_vertex_colors(gaussians),
            'gaussians': gaussians,
            'method': 'layergs',
        }

    def _render_fallback(self, body_mesh: Dict, frame_paths: List[str]) -> Dict:
        """
        Fallback: Project mesh vertices onto video frames and sample colors.

        Uses a simple nearest-frame color sampling for each vertex.
        """
        import cv2

        vertices = body_mesh['vertices']
        faces = body_mesh['faces']

        if len(vertices) == 0 or not frame_paths:
            return {
                'vertices': vertices,
                'faces': faces,
                'vertex_colors': np.ones((len(vertices), 4)) * 0.7,
                'method': 'empty_fallback',
            }

        # Sample colors from multiple frames
        all_colors = []

        # Use up to 10 evenly spaced frames
        n_sample = min(10, len(frame_paths))
        indices = np.linspace(0, len(frame_paths) - 1, n_sample, dtype=int)

        for idx in indices:
            img = cv2.imread(frame_paths[idx])
            if img is None:
                continue
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            h, w = img_rgb.shape[:2]

            # Project vertices to image (simple orthographic projection)
            colors = self._project_and_sample(vertices, img_rgb)
            all_colors.append(colors)

        if all_colors:
            # Average colors across frames
            avg_colors = np.mean(all_colors, axis=0)  # (V, 3)
        else:
            avg_colors = np.ones((len(vertices), 3)) * 180  # Gray fallback

        # Normalize to [0, 1] and add alpha
        avg_colors = np.clip(avg_colors / 255.0, 0, 1)
        vertex_colors = np.column_stack([avg_colors, np.ones(len(vertices))])  # RGBA

        logger.info("LayerGS fallback: textured %d vertices from %d frames",
                     len(vertices), len(all_colors))

        return {
            'vertices': vertices,
            'faces': faces,
            'vertex_colors': vertex_colors,
            'method': 'vertex_color_fallback',
        }

    def _project_and_sample(self, vertices: np.ndarray, image: np.ndarray) -> np.ndarray:
        """
        Simple orthographic projection of vertices onto an image.
        Returns sampled RGB colors per vertex.
        """
        h, w = image.shape[:2]

        # Normalize vertex positions to [0, 1] range
        v_min = vertices.min(axis=0)
        v_max = vertices.max(axis=0)
        v_range = v_max - v_min
        v_range = np.where(v_range < 1e-8, 1.0, v_range)

        normalized = (vertices - v_min) / v_range

        # Map to image coordinates (front view: X→u, Y→v inverted)
        u = (normalized[:, 0] * (w - 1)).astype(int)
        v = ((1 - normalized[:, 1]) * (h - 1)).astype(int)

        u = np.clip(u, 0, w - 1)
        v = np.clip(v, 0, h - 1)

        # Sample colors
        colors = image[v, u]  # (V, 3)
        return colors.astype(np.float64)

    def _gaussians_to_vertex_colors(self, gaussians: Dict) -> np.ndarray:
        """Convert Gaussian colors to per-vertex RGBA."""
        colors = gaussians.get('colors', np.ones((1, 3)) * 0.5)
        opacities = gaussians.get('opacities', np.ones(len(colors)))
        colors_norm = np.clip(colors, 0, 1)
        return np.column_stack([colors_norm, opacities])

    # ─────────────────────────────────────────
    # Measurement extraction from rendered mesh
    # ─────────────────────────────────────────

    def extract_measurements_from_render(self, vertices: np.ndarray,
                                          faces: np.ndarray,
                                          height_cm: float) -> Dict:
        """
        Extract approximate measurements from the rendered mesh.
        Used by the comparative analysis step.
        """
        if len(vertices) == 0:
            return {'chest_circumference': 0, 'waist_circumference': 0}

        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        body_height = y_max - y_min
        scale = height_cm / body_height if body_height > 0 else 1.0

        def slice_circ(frac):
            y = y_min + frac * body_height
            tol = body_height * 0.015
            mask = np.abs(vertices[:, 1] - y) < tol
            if np.sum(mask) < 4:
                return 0.0
            pts = vertices[mask][:, [0, 2]]
            try:
                from scipy.spatial import ConvexHull
                hull = ConvexHull(pts)
                perimeter = sum(
                    np.linalg.norm(pts[s[1]] - pts[s[0]])
                    for s in hull.simplices
                )
                return perimeter * scale
            except Exception:
                rx = (pts[:, 0].max() - pts[:, 0].min()) / 2
                ry = (pts[:, 1].max() - pts[:, 1].min()) / 2
                return np.pi * (3*(rx+ry) - np.sqrt((3*rx+ry)*(rx+3*ry))) * scale

        return {
            'chest_circumference': slice_circ(0.72),
            'waist_circumference': slice_circ(0.60),
        }

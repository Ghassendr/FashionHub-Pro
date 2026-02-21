"""
DressRecon Extractor — Extract nude body mesh from clothed video.

Uses DressRecon when available, falls back to using the SMPL-X T-pose
mesh directly (which is already a nude body representation).

Output: body_nude_mesh.obj checkpoint.
"""

import os
import logging
import numpy as np
from typing import Dict, List, Optional

from .checkpoint_manager import (
    save_checkpoint, load_checkpoint, checkpoint_exists, vram_cleanup, get_device
)

logger = logging.getLogger(__name__)


class DressReconExtractor:
    """
    Module 4 of the hybrid pipeline.

    Separates the nude body mesh from clothing using video evidence.
    The resulting mesh feeds both Branch A (measurements) and Branch B (rendering).
    """

    def __init__(self):
        self.device = get_device()
        self._model = None
        self._use_fallback = False
        self._init_model()

    def _init_model(self):
        """Try to load DressRecon. Gracefully degrade."""
        try:
            # DressRecon is a research model — import path varies
            from dressrecon import DressReconModel
            self._model = DressReconModel.from_pretrained()
            if self.device is not None:
                import torch
                self._model = self._model.to(self.device)
                self._model.eval()
            logger.info("DressRecon: model loaded on %s", self.device)
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning("DressRecon: load error: %s", e)

        self._use_fallback = True
        logger.info("DressRecon: using SMPL-X mesh as nude body fallback")

    def extract(self, frame_paths: List[str], smplx_params: Dict,
                checkpoint_dir: str) -> Dict:
        """
        Extract the nude body mesh.

        Args:
            frame_paths: List of frame image paths.
            smplx_params: Output from SMPLFitter.fit()
            checkpoint_dir: Checkpoint directory.

        Returns:
            Dict with keys:
              - vertices: np.ndarray (V, 3)
              - faces: np.ndarray (F, 3)
              - normals: np.ndarray (V, 3) — per-vertex normals
              - method: str
        """
        # ── Check cached ──
        cached = load_checkpoint("body_nude_mesh", checkpoint_dir)
        if cached is not None:
            logger.info("DressReconExtractor: using cached nude mesh")
            return self._ensure_dict(cached)

        if self._use_fallback:
            result = self._extract_fallback(smplx_params)
        else:
            result = self._extract_dressrecon(frame_paths, smplx_params)

        # Save as .obj for inspection
        self._save_mesh_checkpoint(result, checkpoint_dir)
        vram_cleanup()
        return result

    def _extract_dressrecon(self, frame_paths: List[str], smplx_params: Dict) -> Dict:
        """Run DressRecon inference."""
        import torch
        import cv2

        # Prepare input batch
        frames_tensor = []
        for fpath in frame_paths[:30]:  # DressRecon works with a subset
            img = cv2.imread(fpath)
            if img is None:
                continue
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (512, 512))
            t = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
            frames_tensor.append(t)

        if not frames_tensor:
            return self._extract_fallback(smplx_params)

        batch = torch.stack(frames_tensor).to(self.device)
        betas = torch.tensor(smplx_params['beta_locked'], dtype=torch.float32).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self._model(batch, betas=betas)

        vertices = output['vertices'].cpu().numpy().squeeze()
        faces = output['faces'].cpu().numpy().squeeze()

        # Compute normals
        normals = self._compute_normals(vertices, faces)

        return {
            'vertices': vertices,
            'faces': faces,
            'normals': normals,
            'method': 'dressrecon',
        }

    def _extract_fallback(self, smplx_params: Dict) -> Dict:
        """
        Fallback: use the SMPL-X (or AnatomicalMeshBuilder) T-pose mesh directly.

        The T-pose mesh from SMPLFitter is already a nude body. We refine it
        slightly by smoothing and recomputing normals.
        """
        vertices = smplx_params.get('vertices')
        faces = smplx_params.get('faces')

        if vertices is None or faces is None:
            logger.error("DressRecon fallback: no vertices/faces in smplx_params")
            return {
                'vertices': np.zeros((0, 3)),
                'faces': np.zeros((0, 3), dtype=np.int64),
                'normals': np.zeros((0, 3)),
                'method': 'empty_fallback',
            }

        # Light Laplacian smoothing to improve surface quality
        vertices = self._laplacian_smooth(vertices, faces, iterations=2, factor=0.3)

        # Recompute normals
        normals = self._compute_normals(vertices, faces)

        logger.info("DressRecon fallback: using SMPL-X mesh (%d verts, %d faces)",
                     len(vertices), len(faces))

        return {
            'vertices': vertices,
            'faces': faces,
            'normals': normals,
            'method': 'smplx_fallback',
        }

    def _save_mesh_checkpoint(self, result: Dict, checkpoint_dir: str):
        """Save nude mesh as both .obj and .npz."""
        try:
            import trimesh
            mesh = trimesh.Trimesh(
                vertices=result['vertices'],
                faces=result['faces'],
                vertex_normals=result.get('normals'),
                process=False
            )
            save_checkpoint(mesh, "body_nude_mesh", checkpoint_dir)
        except Exception as e:
            logger.warning("Could not save mesh checkpoint: %s", e)
            # Fall back to .npz
            save_checkpoint({
                'vertices': result['vertices'],
                'faces': result['faces'],
                'normals': result.get('normals', np.zeros_like(result['vertices'])),
            }, "body_nude_mesh_arrays", checkpoint_dir)

    def _ensure_dict(self, data) -> Dict:
        """Ensure loaded checkpoint is in dict format."""
        try:
            import trimesh
            if isinstance(data, trimesh.Trimesh):
                return {
                    'vertices': np.array(data.vertices),
                    'faces': np.array(data.faces),
                    'normals': np.array(data.vertex_normals),
                    'method': 'cached',
                }
        except ImportError:
            pass

        if isinstance(data, dict):
            return data
        return {'vertices': np.zeros((0, 3)), 'faces': np.zeros((0, 3), dtype=np.int64),
                'normals': np.zeros((0, 3)), 'method': 'unknown'}

    @staticmethod
    def _compute_normals(vertices: np.ndarray, faces: np.ndarray) -> np.ndarray:
        """Compute per-vertex normals from faces."""
        normals = np.zeros_like(vertices)
        if len(faces) == 0:
            return normals

        v0 = vertices[faces[:, 0]]
        v1 = vertices[faces[:, 1]]
        v2 = vertices[faces[:, 2]]

        face_normals = np.cross(v1 - v0, v2 - v0)
        # Normalize face normals
        norms = np.linalg.norm(face_normals, axis=1, keepdims=True)
        norms = np.where(norms < 1e-10, 1.0, norms)
        face_normals /= norms

        # Accumulate to vertices
        for i in range(3):
            np.add.at(normals, faces[:, i], face_normals)

        # Normalize vertex normals
        norms = np.linalg.norm(normals, axis=1, keepdims=True)
        norms = np.where(norms < 1e-10, 1.0, norms)
        normals /= norms

        return normals

    @staticmethod
    def _laplacian_smooth(vertices: np.ndarray, faces: np.ndarray,
                          iterations: int = 2, factor: float = 0.3) -> np.ndarray:
        """Simple Laplacian smoothing to improve surface quality."""
        from collections import defaultdict

        # Build adjacency
        adj = defaultdict(set)
        for f in faces:
            for i in range(3):
                for j in range(3):
                    if i != j:
                        adj[f[i]].add(f[j])

        verts = vertices.copy()
        for _ in range(iterations):
            new_verts = verts.copy()
            for vi, neighbors in adj.items():
                if not neighbors:
                    continue
                neighbor_verts = verts[list(neighbors)]
                centroid = neighbor_verts.mean(axis=0)
                new_verts[vi] = verts[vi] + factor * (centroid - verts[vi])
            verts = new_verts

        return verts

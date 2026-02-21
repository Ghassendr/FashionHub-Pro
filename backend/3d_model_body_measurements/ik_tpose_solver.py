"""
IK T-Pose Solver — Force mesh into T-Pose via Inverse Kinematics.

Applies joint rotations to bring the mesh from its current pose into
a canonical T-Pose, preserving segment volumes via Laplacian correction.

Used by Branch A (Couture) before passing the mesh to Shapy.
"""

import logging
import numpy as np
from typing import Dict, Optional
from collections import defaultdict

from .checkpoint_manager import save_checkpoint, load_checkpoint, vram_cleanup

logger = logging.getLogger(__name__)

# SMPL skeleton hierarchy (parent index, -1 = root)
SMPL_PARENTS = [
    -1,  # 0: pelvis
    0,   # 1: left_hip
    0,   # 2: right_hip
    0,   # 3: spine1
    1,   # 4: left_knee
    2,   # 5: right_knee
    3,   # 6: spine2
    4,   # 7: left_ankle
    5,   # 8: right_ankle
    6,   # 9: spine3
    7,   # 10: left_foot
    8,   # 11: right_foot
    9,   # 12: neck
    9,   # 13: left_collar
    9,   # 14: right_collar
    12,  # 15: head
    13,  # 16: left_shoulder
    14,  # 17: right_shoulder
    16,  # 18: left_elbow
    17,  # 19: right_elbow
    18,  # 20: left_wrist
    19,  # 21: right_wrist
    20,  # 22: left_hand
    21,  # 23: right_hand
]

# T-Pose target joint positions (normalized to unit height)
# Arms extended horizontally, legs straight down
TPOSE_DIRECTIONS = {
    # Joint index: target direction FROM parent joint (unit vector)
    1:  np.array([0.1, -1.0, 0.0]),   # left_hip → down-left
    2:  np.array([-0.1, -1.0, 0.0]),  # right_hip → down-right
    3:  np.array([0.0, 1.0, 0.0]),    # spine1 → up
    4:  np.array([0.0, -1.0, 0.0]),   # left_knee → down
    5:  np.array([0.0, -1.0, 0.0]),   # right_knee → down
    6:  np.array([0.0, 1.0, 0.0]),    # spine2 → up
    7:  np.array([0.0, -1.0, 0.0]),   # left_ankle → down
    8:  np.array([0.0, -1.0, 0.0]),   # right_ankle → down
    9:  np.array([0.0, 1.0, 0.0]),    # spine3 → up
    12: np.array([0.0, 1.0, 0.0]),    # neck → up
    15: np.array([0.0, 1.0, 0.0]),    # head → up
    16: np.array([1.0, 0.0, 0.0]),    # left_shoulder → left (T-pose)
    17: np.array([-1.0, 0.0, 0.0]),   # right_shoulder → right (T-pose)
    18: np.array([1.0, 0.0, 0.0]),    # left_elbow → left
    19: np.array([-1.0, 0.0, 0.0]),   # right_elbow → right
    20: np.array([1.0, 0.0, 0.0]),    # left_wrist → left
    21: np.array([-1.0, 0.0, 0.0]),   # right_wrist → right
}


class IKTPoseSolver:
    """
    Branch A — Step 1.

    Forces the mesh into a canonical T-Pose by computing per-joint
    rotations and applying them to the vertex positions.

    Volume preservation is achieved by:
      1. Computing rotation at each joint
      2. Applying rotation to all vertices influenced by that joint
      3. Post-rotation Laplacian correction to restore local geometry
    """

    def solve(self, body_mesh: Dict, smplx_params: Dict,
              checkpoint_dir: str) -> Dict:
        """
        Transform mesh into T-Pose.

        Args:
            body_mesh: Output from DressReconExtractor.extract()
            smplx_params: Output from SMPLFitter.fit() (contains joints)
            checkpoint_dir: Checkpoint directory.

        Returns:
            Dict with keys:
              - vertices: np.ndarray (V, 3) — T-pose vertices
              - faces: np.ndarray (F, 3)
              - normals: np.ndarray (V, 3)
              - method: str
        """
        # ── Check cached ──
        cached = load_checkpoint("tpose_mesh", checkpoint_dir)
        if cached is not None:
            logger.info("IKTPoseSolver: using cached T-pose mesh")
            return self._ensure_dict(cached)

        vertices = body_mesh['vertices'].copy()
        faces = body_mesh['faces'].copy()
        joints = smplx_params.get('joints', None)
        method = smplx_params.get('method', 'unknown')

        if joints is None or len(joints) < 24:
            logger.warning("IKTPoseSolver: no joints available, returning mesh as-is")
            result = {
                'vertices': vertices,
                'faces': faces,
                'normals': body_mesh.get('normals', self._compute_normals(vertices, faces)),
                'method': f'passthrough_{method}',
            }
            self._save(result, checkpoint_dir)
            return result

        # ── If already in T-Pose (from fallback), skip IK ──
        if method in ('anatomical_fallback', 'cube_fallback'):
            logger.info("IKTPoseSolver: mesh already in T-pose (from %s), skipping IK", method)
            result = {
                'vertices': vertices,
                'faces': faces,
                'normals': body_mesh.get('normals', self._compute_normals(vertices, faces)),
                'method': f'already_tpose_{method}',
            }
            self._save(result, checkpoint_dir)
            return result

        # ── Compute skinning weights (nearest-joint assignment) ──
        weights = self._compute_skinning_weights(vertices, joints)

        # ── Compute per-joint rotation to T-Pose ──
        rotations = self._compute_tpose_rotations(joints)

        # ── Apply rotations ──
        tpose_verts = self._apply_rotations(vertices, joints, weights, rotations)

        # ── Laplacian volume correction ──
        tpose_verts = self._laplacian_correction(
            vertices, tpose_verts, faces, iterations=3, factor=0.5
        )

        # ── Recompute normals ──
        normals = self._compute_normals(tpose_verts, faces)

        result = {
            'vertices': tpose_verts,
            'faces': faces,
            'normals': normals,
            'method': 'ik_tpose',
        }
        self._save(result, checkpoint_dir)
        vram_cleanup()
        return result

    def _compute_skinning_weights(self, vertices: np.ndarray,
                                   joints: np.ndarray) -> np.ndarray:
        """
        Assign each vertex to its nearest joint (rigid skinning).
        Returns array of joint indices per vertex.
        """
        # Compute distance from each vertex to each joint
        # vertices: (V, 3), joints: (J, 3)
        dists = np.linalg.norm(vertices[:, None, :] - joints[None, :, :], axis=2)  # (V, J)
        return np.argmin(dists, axis=1)  # (V,) — joint index per vertex

    def _compute_tpose_rotations(self, joints: np.ndarray) -> Dict[int, np.ndarray]:
        """
        Compute rotation matrix for each joint to bring it to T-Pose direction.
        """
        rotations = {}

        for joint_idx, target_dir in TPOSE_DIRECTIONS.items():
            parent_idx = SMPL_PARENTS[joint_idx]
            if parent_idx < 0:
                continue

            # Current direction from parent to child
            current_dir = joints[joint_idx] - joints[parent_idx]
            length = np.linalg.norm(current_dir)
            if length < 1e-8:
                continue
            current_dir /= length

            # Target direction (normalized)
            target = target_dir / np.linalg.norm(target_dir)

            # Rotation matrix from current to target
            R = self._rotation_between_vectors(current_dir, target)
            rotations[joint_idx] = R

        return rotations

    def _apply_rotations(self, vertices: np.ndarray, joints: np.ndarray,
                         weights: np.ndarray, rotations: Dict[int, np.ndarray]) -> np.ndarray:
        """Apply per-joint rotations to vertices based on skinning weights."""
        result = vertices.copy()

        # Process joints from leaves to root (so child rotations compose correctly)
        for joint_idx in sorted(rotations.keys(), reverse=True):
            R = rotations[joint_idx]
            parent_idx = SMPL_PARENTS[joint_idx]
            pivot = joints[parent_idx]

            # Find all vertices assigned to this joint or its children
            affected = self._get_affected_joints(joint_idx)
            mask = np.isin(weights, list(affected))

            if not np.any(mask):
                continue

            # Rotate around pivot
            centered = result[mask] - pivot
            rotated = (R @ centered.T).T + pivot
            result[mask] = rotated

        return result

    def _get_affected_joints(self, joint_idx: int) -> set:
        """Get all joints that are children of the given joint (inclusive)."""
        affected = {joint_idx}
        for i, parent in enumerate(SMPL_PARENTS):
            if parent in affected:
                affected.add(i)
        # Iterate until no new children found
        changed = True
        while changed:
            changed = False
            for i, parent in enumerate(SMPL_PARENTS):
                if parent in affected and i not in affected:
                    affected.add(i)
                    changed = True
        return affected

    def _laplacian_correction(self, original: np.ndarray, deformed: np.ndarray,
                               faces: np.ndarray, iterations: int = 3,
                               factor: float = 0.5) -> np.ndarray:
        """
        Laplacian-based volume preservation.

        Blends the deformed mesh back towards local detail preservation
        from the original mesh to prevent volume loss from rigid rotations.
        """
        # Build adjacency
        adj = defaultdict(set)
        for f in faces:
            for i in range(3):
                for j in range(3):
                    if i != j:
                        adj[f[i]].add(f[j])

        # Compute original Laplacian coordinates (delta vectors)
        original_delta = np.zeros_like(original)
        for vi, neighbors in adj.items():
            if neighbors:
                nbr_mean = original[list(neighbors)].mean(axis=0)
                original_delta[vi] = original[vi] - nbr_mean

        # Iteratively push deformed mesh towards preserving original Laplacians
        result = deformed.copy()
        for _ in range(iterations):
            new_result = result.copy()
            for vi, neighbors in adj.items():
                if not neighbors:
                    continue
                nbr_mean = result[list(neighbors)].mean(axis=0)
                current_delta = result[vi] - nbr_mean
                # Blend towards original delta
                target = nbr_mean + original_delta[vi]
                new_result[vi] = result[vi] + factor * (target - result[vi])
            result = new_result

        return result

    @staticmethod
    def _rotation_between_vectors(v1: np.ndarray, v2: np.ndarray) -> np.ndarray:
        """Compute rotation matrix that rotates v1 to v2."""
        v1 = v1 / np.linalg.norm(v1)
        v2 = v2 / np.linalg.norm(v2)

        cross = np.cross(v1, v2)
        dot = np.dot(v1, v2)

        if np.linalg.norm(cross) < 1e-8:
            if dot > 0:
                return np.eye(3)
            else:
                # 180° rotation — find perpendicular axis
                perp = np.array([1, 0, 0]) if abs(v1[0]) < 0.9 else np.array([0, 1, 0])
                axis = np.cross(v1, perp)
                axis /= np.linalg.norm(axis)
                # Rodrigues for 180°
                K = np.array([[0, -axis[2], axis[1]],
                              [axis[2], 0, -axis[0]],
                              [-axis[1], axis[0], 0]])
                return np.eye(3) + 2 * K @ K

        # Rodrigues' rotation formula
        K = np.array([[0, -cross[2], cross[1]],
                      [cross[2], 0, -cross[0]],
                      [-cross[1], cross[0], 0]])
        R = np.eye(3) + K + K @ K * (1.0 / (1.0 + dot))
        return R

    @staticmethod
    def _compute_normals(vertices, faces):
        normals = np.zeros_like(vertices)
        if len(faces) == 0:
            return normals
        v0 = vertices[faces[:, 0]]
        v1 = vertices[faces[:, 1]]
        v2 = vertices[faces[:, 2]]
        fn = np.cross(v1 - v0, v2 - v0)
        nrm = np.linalg.norm(fn, axis=1, keepdims=True)
        nrm = np.where(nrm < 1e-10, 1.0, nrm)
        fn /= nrm
        for i in range(3):
            np.add.at(normals, faces[:, i], fn)
        nrm = np.linalg.norm(normals, axis=1, keepdims=True)
        nrm = np.where(nrm < 1e-10, 1.0, nrm)
        normals /= nrm
        return normals

    def _save(self, result, checkpoint_dir):
        try:
            import trimesh
            mesh = trimesh.Trimesh(
                vertices=result['vertices'], faces=result['faces'],
                vertex_normals=result.get('normals'), process=False
            )
            save_checkpoint(mesh, "tpose_mesh", checkpoint_dir)
        except Exception:
            save_checkpoint({
                'vertices': result['vertices'],
                'faces': result['faces'],
                'normals': result.get('normals', np.zeros_like(result['vertices'])),
            }, "tpose_mesh_arrays", checkpoint_dir)

    def _ensure_dict(self, data) -> Dict:
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
        return data if isinstance(data, dict) else {
            'vertices': np.zeros((0, 3)), 'faces': np.zeros((0, 3), dtype=np.int64),
            'normals': np.zeros((0, 3)), 'method': 'unknown'
        }

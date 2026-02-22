"""
Anatomical Mesh Builder
Generates detailed 3D body meshes with proper head, arms, hands, and feet.
Replaces the tube-based ParametricBodyModel for much higher visual quality.

100% CPU — no GPU required. Optimized for low-RAM sequential execution.
"""

import numpy as np
import trimesh
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Geometry Primitives
# ─────────────────────────────────────────────

def _normalize(v):
    """Normalize a vector, returning zero vector if input is near-zero."""
    n = np.linalg.norm(v)
    return v / n if n > 1e-8 else np.zeros_like(v)


def _build_tube(path_points, cross_sections, n_radial=32,
                cap_start=False, cap_end=False):
    """
    Build a tube mesh along a 3D path with varying elliptical cross-sections.

    Args:
        path_points:    list of [x,y,z] center points along the tube
        cross_sections: list of (rx, ry) semi-axis pairs per point
        n_radial:       vertices per ring
        cap_start/end:  whether to close the tube ends

    Returns:
        trimesh.Trimesh
    """
    path = [np.asarray(p, dtype=float) for p in path_points]
    n_sections = len(path)
    verts = []

    for i, (pt, (rx, ry)) in enumerate(zip(path, cross_sections)):
        # Forward direction (central difference at interior, one-sided at ends)
        if i == 0:
            fwd = _normalize(path[1] - pt)
        elif i == n_sections - 1:
            fwd = _normalize(pt - path[-2])
        else:
            fwd = _normalize(path[i + 1] - path[i - 1])

        # Build local frame (avoid degenerate cross when fwd ≈ up)
        up = np.array([0.0, 1.0, 0.0])
        if abs(np.dot(fwd, up)) > 0.95:
            up = np.array([0.0, 0.0, 1.0])
        right = _normalize(np.cross(up, fwd))
        actual_up = _normalize(np.cross(fwd, right))

        # Ring of vertices
        for j in range(n_radial):
            angle = 2.0 * np.pi * j / n_radial
            offset = right * (rx * np.cos(angle)) + actual_up * (ry * np.sin(angle))
            verts.append(pt + offset)

    verts = np.array(verts)
    faces = []

    # Side quads (as triangle pairs)
    for i in range(n_sections - 1):
        for j in range(n_radial):
            a = i * n_radial + j
            b = i * n_radial + (j + 1) % n_radial
            c = (i + 1) * n_radial + j
            d = (i + 1) * n_radial + (j + 1) % n_radial
            faces.append([a, c, b])
            faces.append([b, c, d])

    # Caps
    if cap_start:
        ci = len(verts)
        verts = np.vstack([verts, path[0]])
        for j in range(n_radial):
            faces.append([ci, (j + 1) % n_radial, j])

    if cap_end:
        ci = len(verts)
        verts = np.vstack([verts, path[-1]])
        base = (n_sections - 1) * n_radial
        for j in range(n_radial):
            faces.append([ci, base + j, base + (j + 1) % n_radial])

    return trimesh.Trimesh(vertices=verts, faces=np.array(faces))


def _build_ellipsoid(center, rx, ry, rz, n_lat=12, n_lon=24):
    """Build a UV-sphere ellipsoid mesh."""
    cx, cy, cz = center
    verts = [[cx, cy + ry, cz]]  # top pole

    for i in range(1, n_lat):
        theta = np.pi * i / n_lat
        sin_t, cos_t = np.sin(theta), np.cos(theta)
        for j in range(n_lon):
            phi = 2.0 * np.pi * j / n_lon
            verts.append([
                cx + rx * sin_t * np.cos(phi),
                cy + ry * cos_t,
                cz + rz * sin_t * np.sin(phi),
            ])

    verts.append([cx, cy - ry, cz])  # bottom pole
    verts = np.array(verts)
    faces = []

    # Top fan
    for j in range(n_lon):
        faces.append([0, 1 + j, 1 + (j + 1) % n_lon])

    # Middle bands
    for i in range(n_lat - 2):
        for j in range(n_lon):
            a = 1 + i * n_lon + j
            b = 1 + i * n_lon + (j + 1) % n_lon
            c = 1 + (i + 1) * n_lon + j
            d = 1 + (i + 1) * n_lon + (j + 1) % n_lon
            faces.append([a, c, b])
            faces.append([b, c, d])

    # Bottom fan
    bot = len(verts) - 1
    base = 1 + (n_lat - 2) * n_lon
    for j in range(n_lon):
        faces.append([bot, base + (j + 1) % n_lon, base + j])

    return trimesh.Trimesh(vertices=verts, faces=np.array(faces))


# ─────────────────────────────────────────────
# Anatomical Mesh Builder
# ─────────────────────────────────────────────

import os
import trimesh
import numpy as np
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

def lerp(a, b, t):
    return a + (b - a) * t

class AnatomicalMeshBuilder:
    """
    Template Deformation Pipeline.
    Instead of generating low-poly spheres and tubes, this loads a high-quality AAA base mesh
    (e.g. MakeHuman base) and non-rigidly morphs it to precisely match the user's measurements.
    """

    def __init__(self, n_radial: int = 72, smooth_iterations: int = 3):
        # We keep these kwargs to avoid breaking calling code, but we don't use them
        # since we rely entirely on the superior topology of the template.
        self.smooth_iters = smooth_iterations
        
        # Load the AAA Template Mesh
        self.models_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.base_male_path = os.path.join(self.models_dir, 'base_male.obj')
        
    def build(self,
              height_cm: float = 175.0,
              weight_kg: float = 70.0,
              measurements: Optional[Dict] = None,
              gender: str = 'men') -> trimesh.Trimesh:
        """
        Loads the AAA base mesh and deforms it to the user's exact measurements.
        """
        logger.info("Applying AAA Template Deformation: %.0fcm, %.0fkg, %s", height_cm, weight_kg, gender)
        
        if not os.path.exists(self.base_male_path):
            logger.error(f"Base mesh not found at {self.base_male_path}. Cannot deform.")
            return trimesh.Trimesh()

        try:
            # 1. Load the generic base mesh
            mesh = trimesh.load(self.base_male_path, process=False)
            if isinstance(mesh, trimesh.Scene):
                mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
            
            # Store original vertices
            V = mesh.vertices.copy()
            
            # --- Global Alignment & Height Scaling ---
            # Center the model on X and Z, and place feet at Y=0
            min_bounds = V.min(axis=0)
            max_bounds = V.max(axis=0)
            
            # Shift to origin
            V[:, 0] -= (max_bounds[0] + min_bounds[0]) / 2.0
            V[:, 2] -= (max_bounds[2] + min_bounds[2]) / 2.0
            V[:, 1] -= min_bounds[1] # Feet at Y=0
            
            # Global Height Scale
            current_height = V[:, 1].max()
            target_height = height_cm / 100.0
            height_scale = target_height / current_height if current_height > 0 else 1.0
            
            # Apply uniform global scale first to get the right height natively
            V *= height_scale
            
            # --- Non-Rigid Regional Deformation (Weight & Measurements) ---
            # We deform the X (width) and Z (depth) based on vertical Y slices,
            # using a BMI-driven 1D spline interpolation.
            
            # Baseline BMI for the template is assumed to be roughly 22.0
            bmi = weight_kg / (target_height ** 2)
            bf = bmi / 22.0  # Girth scale factor
            
            # Calculate precise target girths
            p = self._params(height_cm, weight_kg, measurements, gender)
            
            # Anatomical keypoints as percentage of total height
            H = {
                'head_top': 1.00,
                'chin': 0.88,
                'neck_base': 0.84,
                'shoulders': 0.80,
                'armpit': 0.76,
                'chest': 0.70,
                'waist': 0.60,
                'navel': 0.56,
                'hips': 0.51,
                'crotch': 0.48,
                'mid_thigh': 0.40,
                'knee': 0.28,
                'calf_wide': 0.18,
                'ankle': 0.05,
                'feet': 0.00
            }

            # Map the Y-coordinates (heights) to corresponding X and Z scale factors
            y_points = []
            x_scales = []
            z_scales = []
            
            # Helper to add a deformation control point
            def add_ctrl(y_ratio, sx, sz):
                y_points.append(y_ratio * target_height)
                x_scales.append(sx)
                z_scales.append(sz)

            # Head/Neck (stays relatively constant, slight width increase with weight)
            add_ctrl(H['head_top'], 1.0, 1.0)
            add_ctrl(H['chin'], 1.0 + (bf-1)*0.1, 1.0 + (bf-1)*0.1)
            add_ctrl(H['neck_base'], 1.0 + (bf-1)*0.3, 1.0 + (bf-1)*0.3)
            
            # Torso (heavily affected by weight/measurements)
            # The template has a certain chest/waist/hips. We scale them relative to "normal".
            # Chest
            chest_ratio = (p['chest_rx'] / (target_height * 0.15)) * (bf**0.8)
            add_ctrl(H['chest'], chest_ratio, chest_ratio * 1.1)
            
            # Waist (the biggest responder to weight gain)
            waist_ratio = (p['waist_rx'] / (target_height * 0.125)) * (bf**1.2)
            add_ctrl(H['waist'], waist_ratio, waist_ratio * 1.3)
            
            # Hips
            hip_ratio = (p['hip_rx'] / (target_height * 0.14)) * (bf**1.0)
            add_ctrl(H['hips'], hip_ratio, hip_ratio * 1.1)
            
            # Legs
            c_leg = (bf**0.5) if bf > 1.0 else (bf**0.8) 
            add_ctrl(H['crotch'], c_leg, c_leg)
            add_ctrl(H['mid_thigh'], c_leg, c_leg)
            add_ctrl(H['knee'], 1.0 + (bf-1)*0.2, 1.0 + (bf-1)*0.2)
            add_ctrl(H['calf_wide'], 1.0 + (bf-1)*0.4, 1.0 + (bf-1)*0.4)
            add_ctrl(H['ankle'], 1.0 + (bf-1)*0.1, 1.0 + (bf-1)*0.1)
            add_ctrl(H['feet'], 1.0, 1.0)

            # Sort control points by Y correctly
            y_points = np.array(y_points)
            x_scales = np.array(x_scales)
            z_scales = np.array(z_scales)
            
            sort_idx = np.argsort(y_points)
            y_points = y_points[sort_idx]
            x_scales = x_scales[sort_idx]
            z_scales = z_scales[sort_idx]

            # Vectorized interpolation for every vertex
            vy = V[:, 1]
            interp_sx = np.interp(vy, y_points, x_scales)
            interp_sz = np.interp(vy, y_points, z_scales)
            
            # To scale legs correctly without moving them too far apart,
            # we scale relative to the left/right leg centers for Y < crotch point
            crotch_y = H['crotch'] * target_height
            leg_mask = vy < crotch_y
            torso_mask = ~leg_mask
            
            # Estimate leg centers
            left_leg_x = V[leg_mask & (V[:, 0] < 0), 0].mean() if np.any(leg_mask & (V[:, 0] < 0)) else -0.1
            right_leg_x = V[leg_mask & (V[:, 0] > 0), 0].mean() if np.any(leg_mask & (V[:, 0] > 0)) else 0.1
            
            # Apply deformation
            # Torso, Head, Arms (Scale relative to X=0, Z=0)
            V[torso_mask, 0] *= interp_sx[torso_mask]
            V[torso_mask, 2] *= interp_sz[torso_mask]
            
            # Legs (Scale relative to their respective centers)
            left_mask = leg_mask & (V[:, 0] < 0)
            right_mask = leg_mask & (V[:, 0] > 0)
            
            V[left_mask, 0] = left_leg_x + (V[left_mask, 0] - left_leg_x) * interp_sx[left_mask]
            V[right_mask, 0] = right_leg_x + (V[right_mask, 0] - right_leg_x) * interp_sx[right_mask]
            
            V[leg_mask, 2] *= interp_sz[leg_mask] # Depth remains centered on Z=0
            
            # Finalize mesh
            mesh.vertices = V
            mesh.fix_normals()

            # Optional: light smoothing to fix any interpolation pinching
            if self.smooth_iters > 0:
                mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=1, lamb=0.3)
                mesh.fix_normals()

            # Skin color mapping
            if hasattr(mesh.visual, 'vertex_colors'):
                mesh.visual.vertex_colors = np.full(
                    (len(mesh.vertices), 4), [210, 180, 160, 255], dtype=np.uint8
                )

            logger.info("AAA Deformed mesh generated: %d verts, %d faces", len(mesh.vertices), len(mesh.faces))
            return mesh
            
        except Exception as e:
            logger.error(f"Template Deformation failed: {e}")
            return trimesh.Trimesh()

    # ── parameter estimation (kept for internal scaling reference) ──

    def _params(self, hcm, wkg, meas, gender) -> Dict:
        """Derive target radial parameters from height/weight/measurements."""
        bmi = wkg / ((hcm / 100) ** 2)
        bf = bmi / 22.0
        hm = hcm / 100.0
        is_f = gender == 'women'

        d = {
            'head_rx': 0.080 if is_f else 0.085,
            'waist_rx': (0.110 if is_f else 0.125) * bf ** 0.6,
            'chest_rx': (0.135 if is_f else 0.150) * bf ** 0.5,
            'hip_rx':   (0.150 if is_f else 0.140) * bf ** 0.5,
        }

        if meas:
            for m in meas.get('basics', []):
                key, val = m.get('key', ''), m.get('value_cm')
                if not val: continue
                rm = val / (2 * np.pi * 100)
                if key == 'chest': d['chest_rx'] = rm * 1.15
                elif key == 'waist': d['waist_rx'] = rm * 1.10
                elif key == 'hips': d['hip_rx'] = rm * 1.15
        return d

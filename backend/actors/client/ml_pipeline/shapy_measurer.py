"""
Shapy Measurer — Extract anthropometric measurements from T-Pose mesh.

Uses the Shapy model when available, falls back to geodesic/geometric
measurement extraction directly on the mesh.

Output: shapy_measurements.json — structured measurements compatible
with the existing result format.
"""

import logging
import numpy as np
from typing import Dict, Optional

from .checkpoint_manager import save_checkpoint, load_checkpoint, vram_cleanup

logger = logging.getLogger(__name__)

# Standard measurement definitions
# Each measurement has a name, a height fraction (where to slice the body),
# and the type of measurement (circumference, width, or length).
MEASUREMENT_DEFS = {
    'chest': {
        'key': 'chest_circumference',
        'label': 'Tour de Poitrine',
        'height_frac': 0.72,   # fraction from feet
        'type': 'circumference',
        'category': 'basics',
    },
    'waist': {
        'key': 'waist_circumference',
        'label': 'Tour de Taille',
        'height_frac': 0.60,
        'type': 'circumference',
        'category': 'basics',
    },
    'hips': {
        'key': 'hip_circumference',
        'label': 'Tour de Hanches',
        'height_frac': 0.52,
        'type': 'circumference',
        'category': 'basics',
    },
    'neck': {
        'key': 'neck_circumference',
        'label': 'Tour de Cou',
        'height_frac': 0.84,
        'type': 'circumference',
        'category': 'basics',
    },
    'thigh': {
        'key': 'thigh_circumference',
        'label': 'Tour de Cuisse',
        'height_frac': 0.45,
        'type': 'circumference',
        'category': 'basics',
    },
    'bicep': {
        'key': 'bicep_circumference',
        'label': 'Tour de Biceps',
        'height_frac': 0.72,  # measured at arm level, handled specially
        'type': 'arm_circumference',
        'category': 'basics',
    },
    'shoulder_width': {
        'key': 'shoulder_width',
        'label': 'Largeur Épaules',
        'height_frac': 0.80,
        'type': 'width',
        'category': 'widths',
    },
    'torso_length': {
        'key': 'torso_length',
        'label': 'Longueur Torse',
        'height_frac_start': 0.52,
        'height_frac_end': 0.80,
        'type': 'length',
        'category': 'heights',
    },
    'inseam': {
        'key': 'inseam',
        'label': 'Entrejambe',
        'height_frac_start': 0.0,
        'height_frac_end': 0.48,
        'type': 'length',
        'category': 'heights',
    },
    'arm_length': {
        'key': 'arm_length',
        'label': 'Longueur Bras',
        'type': 'arm_length',
        'category': 'heights',
    },
}


class ShapyMeasurer:
    """
    Branch A — Step 2.

    Extracts anthropometric measurements from the T-Pose mesh.
    Strategy:
      1. Try Shapy model (research)
      2. Fallback: geodesic slicing on the mesh
    """

    def __init__(self):
        self._use_fallback = False
        self._init_model()

    def _init_model(self):
        """Try to load Shapy."""
        try:
            from shapy import ShapyModel
            self._model = ShapyModel.from_pretrained()
            logger.info("ShapyMeasurer: Shapy model loaded")
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning("ShapyMeasurer: Shapy load error: %s", e)

        self._use_fallback = True
        logger.info("ShapyMeasurer: using geodesic fallback")

    def measure(self, tpose_mesh: Dict, smplx_params: Dict,
                checkpoint_dir: str) -> Dict:
        """
        Extract measurements from T-Pose mesh.

        Args:
            tpose_mesh: Output from IKTPoseSolver.solve()
            smplx_params: Output from SMPLFitter.fit()
            checkpoint_dir: Checkpoint directory.

        Returns:
            Dict with measurement categories {basics, heights, widths, functional}
            compatible with the existing result format.
        """
        cached = load_checkpoint("shapy_measurements", checkpoint_dir)
        if cached is not None:
            logger.info("ShapyMeasurer: using cached measurements")
            return cached

        height_cm = smplx_params.get('height_cm', 175.0)
        weight_kg = smplx_params.get('weight_kg', 70.0)

        if self._use_fallback:
            result = self._measure_geodesic(tpose_mesh, height_cm, weight_kg)
        else:
            result = self._measure_shapy(tpose_mesh, smplx_params)

        save_checkpoint(result, "shapy_measurements", checkpoint_dir)
        vram_cleanup()
        return result

    def _measure_shapy(self, tpose_mesh: Dict, smplx_params: Dict) -> Dict:
        """Use Shapy model for measurements."""
        beta = smplx_params.get('beta_locked', np.zeros(10))
        # Shapy expects beta → measurements
        measurements = self._model.predict(beta)
        return self._format_measurements(measurements)

    def _measure_geodesic(self, tpose_mesh: Dict, height_cm: float,
                          weight_kg: float) -> Dict:
        """
        Fallback: Compute measurements directly on the mesh geometry.

        Uses cross-sectional slicing to compute circumferences,
        and vertex distances for lengths/widths.
        """
        vertices = tpose_mesh['vertices']
        faces = tpose_mesh['faces']

        if len(vertices) == 0:
            return self._empty_measurements(height_cm)

        # Body bounding box
        y_min, y_max = vertices[:, 1].min(), vertices[:, 1].max()
        body_height = y_max - y_min

        # Scale factor: mesh units → cm
        scale = height_cm / body_height if body_height > 0 else 1.0

        measurements_raw = {}

        for name, mdef in MEASUREMENT_DEFS.items():
            mtype = mdef['type']

            if mtype == 'circumference':
                y_level = y_min + mdef['height_frac'] * body_height
                circ = self._slice_circumference(vertices, faces, y_level) * scale
                measurements_raw[name] = circ

            elif mtype == 'arm_circumference':
                circ = self._arm_circumference(vertices, faces, y_min, body_height) * scale
                measurements_raw[name] = circ

            elif mtype == 'width':
                y_level = y_min + mdef['height_frac'] * body_height
                width = self._slice_width(vertices, y_level, body_height * 0.02) * scale
                measurements_raw[name] = width

            elif mtype == 'length':
                y_start = y_min + mdef['height_frac_start'] * body_height
                y_end = y_min + mdef['height_frac_end'] * body_height
                length = abs(y_end - y_start) * scale
                measurements_raw[name] = length

            elif mtype == 'arm_length':
                length = self._arm_length(vertices, y_min, body_height) * scale
                measurements_raw[name] = length

        return self._format_measurements(measurements_raw)

    def _slice_circumference(self, vertices: np.ndarray, faces: np.ndarray,
                              y_level: float, tolerance_frac: float = 0.015) -> float:
        """
        Compute circumference at a given Y level by slicing the mesh.

        Finds all vertices near the Y level, projects them onto the XZ plane,
        and computes the perimeter of the convex hull.
        """
        y_range = (vertices[:, 1].max() - vertices[:, 1].min()) * tolerance_frac
        mask = np.abs(vertices[:, 1] - y_level) < y_range

        if np.sum(mask) < 4:
            # Widen tolerance
            y_range *= 3
            mask = np.abs(vertices[:, 1] - y_level) < y_range

        if np.sum(mask) < 4:
            return 0.0

        points_xz = vertices[mask][:, [0, 2]]  # Project to XZ

        # Compute convex hull perimeter
        try:
            from scipy.spatial import ConvexHull
            hull = ConvexHull(points_xz)
            # Perimeter = sum of edge lengths
            perimeter = 0.0
            for simplex in hull.simplices:
                p1 = points_xz[simplex[0]]
                p2 = points_xz[simplex[1]]
                perimeter += np.linalg.norm(p2 - p1)
            return perimeter
        except Exception:
            # Fallback: ellipse approximation
            rx = (points_xz[:, 0].max() - points_xz[:, 0].min()) / 2
            ry = (points_xz[:, 1].max() - points_xz[:, 1].min()) / 2
            return np.pi * (3 * (rx + ry) - np.sqrt((3 * rx + ry) * (rx + 3 * ry)))

    def _arm_circumference(self, vertices: np.ndarray, faces: np.ndarray,
                            y_min: float, body_height: float) -> float:
        """Estimate bicep circumference from arm vertices."""
        # Arms are at X extremes in T-Pose
        x_center = (vertices[:, 0].max() + vertices[:, 0].min()) / 2
        body_width = vertices[:, 0].max() - vertices[:, 0].min()

        # Left arm: X > center + 30% of half-width
        arm_threshold = x_center + 0.3 * (body_width / 2)
        arm_y_level = y_min + 0.72 * body_height  # Upper arm level

        y_range = body_height * 0.03
        mask = (vertices[:, 0] > arm_threshold) & \
               (np.abs(vertices[:, 1] - arm_y_level) < y_range)

        if np.sum(mask) < 3:
            return 0.0

        # Cross-section in YZ plane
        points = vertices[mask][:, [1, 2]]
        rx = (points[:, 0].max() - points[:, 0].min()) / 2
        ry = (points[:, 1].max() - points[:, 1].min()) / 2
        return np.pi * (3 * (rx + ry) - np.sqrt((3 * rx + ry) * (rx + 3 * ry)))

    def _arm_length(self, vertices: np.ndarray, y_min: float,
                    body_height: float) -> float:
        """Estimate arm length from shoulder to wrist extent."""
        x_center = (vertices[:, 0].max() + vertices[:, 0].min()) / 2
        body_width = vertices[:, 0].max() - vertices[:, 0].min()

        # Arm starts at shoulder width and extends
        shoulder_x = x_center + 0.2 * (body_width / 2)
        wrist_x = vertices[:, 0].max()

        return abs(wrist_x - shoulder_x)

    def _slice_width(self, vertices: np.ndarray, y_level: float,
                     tolerance: float) -> float:
        """Compute width at a Y level."""
        mask = np.abs(vertices[:, 1] - y_level) < tolerance
        if np.sum(mask) < 2:
            return 0.0
        x_vals = vertices[mask][:, 0]
        return x_vals.max() - x_vals.min()

    def _format_measurements(self, raw: Dict) -> Dict:
        """Format measurements into the result structure expected by the pipeline."""
        categories = {'basics': [], 'heights': [], 'widths': [], 'functional': []}

        for name, mdef in MEASUREMENT_DEFS.items():
            value = raw.get(name, 0.0)
            category = mdef.get('category', 'basics')

            entry = {
                'key': mdef['key'],
                'label': mdef['label'],
                'value': f"{value:.1f}",
                'value_cm': round(value, 1),
                'unit': 'cm',
                'confidence': 0.75 if value > 0 else 0.0,
                'source': 'shapy_pipeline',
            }
            categories.setdefault(category, []).append(entry)

        return categories

    def _empty_measurements(self, height_cm: float) -> Dict:
        """Return empty measurement structure with estimated values."""
        return self._format_measurements({})

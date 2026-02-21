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

class AnatomicalMeshBuilder:
    """
    Builds a detailed 3D body mesh with proper anatomy:
      head, neck, torso, arms (with elbows), hands,
      legs (upper + lower), feet.

    All geometry is CPU-only (numpy + trimesh).
    """

    # Height ratios (fraction of total height, 0 = feet, 1 = head top)
    H = {
        'head_top':   1.00,
        'head_ctr':   0.935,
        'chin':       0.870,
        'neck_base':  0.815,
        'shoulders':  0.790,
        'armpit':     0.755,
        'chest':      0.700,
        'waist':      0.590,
        'navel':      0.560,
        'hips':       0.500,
        'crotch':     0.470,
        'mid_thigh':  0.370,
        'knee':       0.270,
        'calf_wide':  0.200,
        'ankle':      0.050,
        'foot_bot':   0.000,
    }

    def __init__(self, n_radial: int = 32, smooth_iterations: int = 3):
        self.n_radial = max(16, n_radial)
        self.smooth_iters = max(0, smooth_iterations)

    # ── public API ───────────────────────────

    def build(self,
              height_cm: float = 175.0,
              weight_kg: float = 70.0,
              measurements: Optional[Dict] = None,
              gender: str = 'men') -> trimesh.Trimesh:
        """
        Build and return a complete anatomical mesh (T-pose).

        Returns:
            trimesh.Trimesh with ~5 000–10 000 vertices
        """
        hm = height_cm / 100.0
        p = self._params(height_cm, weight_kg, measurements, gender)
        nr = self.n_radial

        logger.info("Building anatomical mesh: %.0fcm, %.0fkg, %s", height_cm, weight_kg, gender)

        parts: List[trimesh.Trimesh] = [
            self._head(hm, p, nr),
            self._neck(hm, p, nr),
            self._torso(hm, p, nr),
        ]

        for side in ('left', 'right'):
            parts.append(self._arm(hm, p, nr, side))
            parts.append(self._hand(hm, p, nr, side))
            parts.append(self._upper_leg(hm, p, nr, side))
            parts.append(self._lower_leg(hm, p, nr, side))
            parts.append(self._foot(hm, p, nr, side))

        mesh = trimesh.util.concatenate(parts)
        mesh.fix_normals()

        # Laplacian smoothing for organic look
        for _ in range(self.smooth_iters):
            try:
                mesh = trimesh.smoothing.filter_laplacian(mesh, iterations=1, lamb=0.5)
            except Exception:
                break

        # Skin color
        mesh.visual.vertex_colors = np.full(
            (len(mesh.vertices), 4), [210, 180, 160, 255], dtype=np.uint8
        )

        logger.info("Anatomical mesh: %d verts, %d faces", len(mesh.vertices), len(mesh.faces))
        return mesh

    # ── parameter estimation ─────────────────

    def _params(self, hcm, wkg, meas, gender) -> Dict:
        """Derive all radii and lengths from height/weight/measurements."""
        bmi = wkg / ((hcm / 100) ** 2)
        bf = bmi / 22.0  # BMI factor (1.0 = average)
        hm = hcm / 100.0

        is_f = gender == 'women'

        d = {
            # Head (meters, semi-axes of ellipsoid)
            'head_rx': 0.080 if is_f else 0.085,
            'head_ry': 0.100 if is_f else 0.105,
            'head_rz': 0.088 if is_f else 0.095,
            # Neck radius
            'neck_r': (0.050 if is_f else 0.060) * bf ** 0.3,
            # Shoulders (half-width from center)
            'sh_hw': hm * (0.215 / 2 if is_f else 0.245 / 2),
            # Torso cross-section semi-axes (rx = left-right, ry = front-back)
            'chest_rx': (0.135 if is_f else 0.150) * bf ** 0.5,
            'chest_ry': (0.105 if is_f else 0.115) * bf ** 0.5,
            'waist_rx': (0.110 if is_f else 0.125) * bf ** 0.6,
            'waist_ry': (0.088 if is_f else 0.098) * bf ** 0.6,
            'hip_rx':   (0.150 if is_f else 0.140) * bf ** 0.5,
            'hip_ry':   (0.110 if is_f else 0.105) * bf ** 0.5,
            # Arms
            'ua_r':  (0.042 if is_f else 0.050) * bf ** 0.4,
            'fa_r':  (0.033 if is_f else 0.040) * bf ** 0.3,
            'wr_r':  0.025 if is_f else 0.028,
            'ua_len': hm * 0.186,
            'fa_len': hm * 0.155,
            'hand_len': hm * 0.105,
            # Legs
            'thigh_r': (0.082 if is_f else 0.088) * bf ** 0.5,
            'knee_r':  0.052 if is_f else 0.058,
            'calf_r':  (0.052 if is_f else 0.058) * bf ** 0.3,
            'ankle_r': 0.033 if is_f else 0.037,
            # Hip joint offset (half distance between leg centers)
            'leg_offset': hm * (0.085 if is_f else 0.080),
            # Foot
            'foot_len': hm * 0.152,
            'foot_w':   0.045 if is_f else 0.050,
            'foot_h':   0.035 if is_f else 0.040,
        }

        # Override from actual measurements
        if meas:
            for m in meas.get('basics', []):
                key, val = m.get('key', ''), m.get('value_cm')
                if not val:
                    continue
                rm = val / (2 * np.pi * 100)  # circ cm → radius m
                if key == 'chest':
                    d['chest_rx'] = rm * 1.15
                    d['chest_ry'] = rm * 0.85
                elif key == 'waist':
                    d['waist_rx'] = rm * 1.10
                    d['waist_ry'] = rm * 0.90
                elif key == 'hips':
                    d['hip_rx'] = rm * 1.15
                    d['hip_ry'] = rm * 0.85
                elif key == 'neck':
                    d['neck_r'] = rm
                elif key == 'thigh':
                    d['thigh_r'] = rm
            for m in meas.get('widths', []):
                if m.get('key') == 'shoulders' and m.get('value_cm'):
                    d['sh_hw'] = m['value_cm'] / 200.0

        return d

    # ── body part builders ───────────────────

    def _head(self, hm, p, nr):
        ctr = [0, hm * self.H['head_ctr'], 0.01]  # slightly forward
        return _build_ellipsoid(ctr, p['head_rx'], p['head_ry'], p['head_rz'],
                                n_lat=14, n_lon=nr)

    def _neck(self, hm, p, nr):
        y0 = hm * self.H['neck_base']
        y1 = hm * self.H['chin']
        r = p['neck_r']
        t = np.linspace(0, 1, 5)
        path = [[0, y0 + (y1 - y0) * ti, 0] for ti in t]
        secs = [
            (r * 1.20, r * 1.05),
            (r * 1.10, r * 1.00),
            (r * 1.00, r * 0.95),
            (r * 0.95, r * 0.90),
            (r * 0.88, r * 0.85),
        ]
        return _build_tube(path, secs, nr, cap_start=True)

    def _torso(self, hm, p, nr):
        H = self.H
        # Key height levels (bottom to top)
        levels = [
            (H['crotch'],   p['hip_rx'] * 0.65,  p['hip_ry'] * 0.55),
            (0.485,         p['hip_rx'] * 0.85,  p['hip_ry'] * 0.75),
            (H['hips'],     p['hip_rx'],         p['hip_ry']),
            (0.530,         p['hip_rx'] * 0.98,  p['hip_ry'] * 0.95),
            (H['navel'],    lerp(p['hip_rx'], p['waist_rx'], 0.4),
                            lerp(p['hip_ry'], p['waist_ry'], 0.4)),
            (H['waist'],    p['waist_rx'],       p['waist_ry']),
            (0.630,         lerp(p['waist_rx'], p['chest_rx'], 0.35),
                            lerp(p['waist_ry'], p['chest_ry'], 0.35)),
            (0.665,         p['chest_rx'] * 0.95, p['chest_ry'] * 0.95),
            (H['chest'],    p['chest_rx'],       p['chest_ry']),
            (0.730,         p['chest_rx'] * 0.95, p['chest_ry'] * 0.88),
            (H['armpit'],   p['sh_hw'] * 0.92,  p['chest_ry'] * 0.72),
            (H['shoulders'], p['sh_hw'],         p['chest_ry'] * 0.58),
            (H['neck_base'], p['neck_r'] * 1.25, p['neck_r'] * 1.10),
        ]
        path = [[0, hm * h, 0] for h, _, _ in levels]
        secs = [(rx, ry) for _, rx, ry in levels]
        return _build_tube(path, secs, nr)

    def _arm(self, hm, p, nr, side):
        s = -1.0 if side == 'left' else 1.0
        sy = hm * self.H['shoulders']
        sh_x = s * p['sh_hw']

        # T-pose: extend arms nearly horizontal with slight natural drop
        elbow_x = sh_x + s * p['ua_len']
        wrist_x = elbow_x + s * p['fa_len']
        drop_e = -0.015 * hm
        drop_w = -0.030 * hm

        path = [
            [sh_x,                              sy,            0],
            [sh_x + s * p['ua_len'] * 0.30,     sy + drop_e * 0.2, 0],
            [sh_x + s * p['ua_len'] * 0.60,     sy + drop_e * 0.5, 0],
            [elbow_x,                            sy + drop_e,  0],
            [elbow_x + s * p['fa_len'] * 0.35,  sy + (drop_e + drop_w) / 2 * 0.7, 0],
            [elbow_x + s * p['fa_len'] * 0.70,  sy + drop_w * 0.8 + drop_e * 0.2, 0],
            [wrist_x,                            sy + drop_w,  0],
        ]

        ua, fa, wr = p['ua_r'], p['fa_r'], p['wr_r']
        secs = [
            (ua * 1.25, ua * 1.15),  # shoulder joint
            (ua * 1.10, ua * 1.00),
            (ua,        ua * 0.95),  # bicep
            (ua * 0.82, fa * 1.15),  # elbow
            (fa * 1.05, fa),
            (fa * 0.95, fa * 0.90),
            (wr,        wr * 0.88),  # wrist
        ]
        return _build_tube(path, secs, nr, cap_start=True, cap_end=True)

    def _hand(self, hm, p, nr, side):
        s = -1.0 if side == 'left' else 1.0
        sy = hm * self.H['shoulders']
        drop_w = -0.030 * hm
        wrist_x = s * (p['sh_hw'] + p['ua_len'] + p['fa_len'])
        wrist_y = sy + drop_w
        hl = p['hand_len']
        wr = p['wr_r']

        path = [
            [wrist_x,                     wrist_y,          0],
            [wrist_x + s * hl * 0.25,     wrist_y - 0.004,  0],
            [wrist_x + s * hl * 0.50,     wrist_y - 0.008,  0],
            [wrist_x + s * hl * 0.80,     wrist_y - 0.012,  0],
            [wrist_x + s * hl,            wrist_y - 0.016,  0],
        ]
        secs = [
            (wr * 1.00, wr * 0.50),  # wrist connection
            (wr * 1.35, wr * 0.45),  # palm base
            (wr * 1.45, wr * 0.42),  # palm widest
            (wr * 1.20, wr * 0.35),  # knuckles
            (wr * 0.55, wr * 0.22),  # fingertips
        ]
        return _build_tube(path, secs, max(nr // 2, 12), cap_end=True)

    def _upper_leg(self, hm, p, nr, side):
        s = -1.0 if side == 'left' else 1.0
        lo = s * p['leg_offset']
        cy = hm * self.H['crotch']
        ky = hm * self.H['knee']

        path = [
            [lo,  cy,                          0],
            [lo,  cy - (cy - ky) * 0.15,       0],
            [lo,  cy - (cy - ky) * 0.35,       0],
            [lo,  hm * self.H['mid_thigh'],    0],
            [lo,  cy - (cy - ky) * 0.70,       0],
            [lo,  cy - (cy - ky) * 0.85,       0],
            [lo,  ky,                          0],
        ]
        tr, kr = p['thigh_r'], p['knee_r']
        secs = [
            (tr * 1.05, tr * 1.00),   # hip joint
            (tr * 1.00, tr * 0.98),
            (tr * 0.95, tr * 0.92),
            (tr * 0.88, tr * 0.85),   # mid thigh
            (tr * 0.78, tr * 0.75),
            (kr * 1.10, kr * 1.05),
            (kr,        kr * 0.95),   # knee
        ]
        return _build_tube(path, secs, nr, cap_start=True)

    def _lower_leg(self, hm, p, nr, side):
        s = -1.0 if side == 'left' else 1.0
        lo = s * p['leg_offset']
        ky = hm * self.H['knee']
        ay = hm * self.H['ankle']
        cw_y = hm * self.H['calf_wide']

        path = [
            [lo,  ky,                          0],
            [lo,  ky - (ky - cw_y) * 0.30,    0],
            [lo,  ky - (ky - cw_y) * 0.60,    0],
            [lo,  cw_y,                        0],
            [lo,  cw_y - (cw_y - ay) * 0.35,  0],
            [lo,  cw_y - (cw_y - ay) * 0.70,  0],
            [lo,  ay,                          0],
        ]
        kr, cr, ar = p['knee_r'], p['calf_r'], p['ankle_r']
        secs = [
            (kr,        kr * 0.95),   # knee joint
            (kr * 0.95, cr * 1.10),
            (cr * 1.05, cr * 1.02),
            (cr,        cr * 0.95),   # widest calf
            (cr * 0.85, cr * 0.80),
            (ar * 1.20, ar * 1.15),
            (ar,        ar * 0.95),   # ankle
        ]
        return _build_tube(path, secs, nr)

    def _foot(self, hm, p, nr, side):
        s = -1.0 if side == 'left' else 1.0
        lo = s * p['leg_offset']
        ay = hm * self.H['ankle']
        fl = p['foot_len']
        fw = p['foot_w']
        fh = p['foot_h']

        # Foot extends forward from ankle
        path = [
            [lo, ay,           -fl * 0.20],  # heel
            [lo, ay * 0.60,    -fl * 0.05],
            [lo, ay * 0.35,     fl * 0.15],
            [lo, ay * 0.20,     fl * 0.40],
            [lo, ay * 0.12,     fl * 0.65],
            [lo, ay * 0.05,     fl * 0.85],  # toes
        ]
        secs = [
            (fw * 0.70, fh * 0.80),  # heel
            (fw * 0.85, fh * 0.90),
            (fw * 1.00, fh * 0.85),  # arch
            (fw * 1.10, fh * 0.65),  # ball
            (fw * 1.05, fh * 0.45),
            (fw * 0.60, fh * 0.25),  # toes
        ]
        return _build_tube(path, secs, max(nr // 2, 12), cap_start=True, cap_end=True)


# ── helper ──────────────────────────
def lerp(a, b, t):
    """Linear interpolation."""
    return a + (b - a) * t

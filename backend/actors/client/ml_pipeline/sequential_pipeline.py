"""
Sequential Pipeline — Optimized for Low-VRAM Hardware
Orchestrates the body analysis steps with explicit memory management.

Designed for: Quadro M1200 (4 GB VRAM), 32 GB RAM, i7-8th gen.
Strategy:  100% sequential, gc.collect() between steps, results written to disk.
"""

import gc
import os
import time
import json
import uuid
import logging
import numpy as np
import cv2
import trimesh
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


def _cleanup():
    """Force garbage collection to free RAM between pipeline steps."""
    gc.collect()


class SequentialPipeline:
    """
    Drop-in replacement for the processing logic in BodyProcessor.process().
    Returns the exact same result dict format, but:
      - Uses AnatomicalMeshBuilder for much better mesh quality
      - Explicitly frees memory between steps
      - Logs memory-aware progress
    """

    def __init__(self, quality: str = 'balanced'):
        from .pipeline_config import get_preset
        self.preset = get_preset(quality)

    # ─── Main entry point ────────────────────

    def run(self,
            video_path: str,
            output_dir: str,
            height_cm: float = 175.0,
            weight_kg: float = 70.0,
            age: int = None,
            gender: str = 'men',
            cut_preference: str = None,
            quality: Optional[str] = None) -> Dict:
        """
        Run the full pipeline sequentially.
        Returns the same result dict as BodyProcessor.process().
        """
        if quality is not None:
            from .pipeline_config import get_preset
            self.preset = get_preset(quality)

        preset = self.preset
        run_id = str(uuid.uuid4())[:8]
        res_dir = os.path.join(output_dir, run_id)
        frames_dir = os.path.join(res_dir, 'frames')
        os.makedirs(res_dir, exist_ok=True)
        start = time.time()

        logger.info("═══ Sequential Pipeline START ═══ preset=%s, %s cm, %s kg",
                     preset.name, height_cm, weight_kg)

        # ── Step 1: Frame extraction ──────────
        logger.info("─── Step 1/6: Extracting frames ───")
        from .body_processor import FrameExtractor
        fe = FrameExtractor(preset.target_frames, preset.max_image_height)
        frames, video_info = fe.extract(video_path, frames_dir)
        del fe
        _cleanup()

        if not frames:
            return self._error(run_id, "Aucune frame extraite", height_cm, weight_kg)

        # ── Step 2: Silhouette segmentation ───
        logger.info("─── Step 2/6: Segmenting silhouettes (%d frames) ───", len(frames))
        from .body_processor import SilhouetteExtractor
        se = SilhouetteExtractor(preset.segment_workers)
        frames = se.process(frames)
        del se
        _cleanup()

        detected = sum(1 for f in frames if f.get('body_detected', False))
        if detected == 0:
            return self._error(run_id, "Aucun corps humain n'a pu être détecté dans la vidéo.", height_cm, weight_kg)

        # ── Step 3: Skeleton / landmarks ──────
        logger.info("─── Step 3/6: Extracting skeleton landmarks ───")
        from .body_processor import SkeletonExtractor
        sk = SkeletonExtractor()
        landmarks = sk.analyze(frames,
                               sample_step=preset.pose_sample_step,
                               max_frames=preset.pose_max_frames)
        del sk
        _cleanup()

        # ── Step 4: Anatomical mesh ──────────
        logger.info("─── Step 4/6: Building anatomical mesh ───")
        mesh_ok, glb_path, smpl_params = self._build_mesh(
            frames, res_dir, height_cm, weight_kg, gender, landmarks, preset
        )
        _cleanup()

        # ── Step 5: Measurements ─────────────
        logger.info("─── Step 5/6: Computing measurements ───")
        from .body_processor import GeodesicMeasurer
        measurer = GeodesicMeasurer()
        if mesh_ok and glb_path:
            measurements = measurer.calculate_from_mesh(
                glb_path, height_cm, landmarks, weight_kg,
                num_slices=preset.geodesic_slices
            )
        else:
            measurements = measurer._get_simulated_measurements(height_cm, weight_kg)
        del measurer
        _cleanup()

        # ── Step 6: Morphology + Fashion ─────
        logger.info("─── Step 6/6: Morphology & fashion analysis ───")
        morphology_data = self._morphology(frames, measurements, height_cm, weight_kg)
        fashion_data = self._fashion(measurements, morphology_data, gender,
                                     cut_preference, age)
        _cleanup()

        # ── Assemble result ──────────────────
        detected = sum(1 for f in frames if f.get('body_detected', False))
        quality_score = min(0.95, detected / len(frames)) if frames else 0.5
        beta_params = self._beta(measurements, morphology_data)

        result = {
            'id': run_id,
            'status': 'completed',
            'video_info': video_info,
            'user_input': {
                'height_cm': height_cm,
                'weight_kg': weight_kg,
                'age': age,
                'gender': gender,
                'cut_preference': cut_preference,
            },
            'measurements': measurements,
            'morphology': morphology_data,
            'morphology_type': morphology_data.get('silhouette', {}).get('shape_letter'),
            'morphology_category': morphology_data.get('silhouette', {}).get('morphology_category'),
            'fashion_recommendations': fashion_data,
            'processing_time_seconds': round(time.time() - start, 2),
            'mesh_path': f"/results/{run_id}/body_mesh.glb" if mesh_ok else None,
            'mesh_url':  f"/results/{run_id}/body_mesh.glb" if mesh_ok else None,
            'overlay_video_path': None,
            'overlay_video_url': None,
            'landmark_fitting_used': True,
            'debug_image': f"/results/{run_id}/extraction_debug.jpg",
            'quality_score': round(quality_score, 2),
            'confidence': round(morphology_data.get('quality_score', 0.7), 2),
            'beta_parameters': beta_params,
            'frames_data': [
                {
                    'frame_number': f['frame_number'],
                    'rotation_angle': f['rotation_angle'],
                    'confidence': 0.9 if f.get('body_detected') else 0.3,
                    'body_detected': f.get('body_detected', False),
                }
                for f in frames
            ],
            'frames_used': detected,
            'total_frames': len(frames),
        }

        with open(os.path.join(res_dir, 'result.json'), 'w', encoding='utf-8') as fp:
            json.dump(result, fp, indent=2, ensure_ascii=False)

        elapsed = result['processing_time_seconds']
        logger.info("═══ Sequential Pipeline DONE ═══ %ss — quality %.0f%%",
                     elapsed, quality_score * 100)
        return result

    # ─── Step 4 implementation ───────────────

    def _build_mesh(self, frames, res_dir, height_cm, weight_kg, gender,
                    landmarks, preset):
        """Build mesh using AnatomicalMeshBuilder, with SMPL fallback."""
        try:
            from .anatomical_mesh_builder import AnatomicalMeshBuilder
            builder = AnatomicalMeshBuilder(
                n_radial=preset.mesh_resolution_radial,
                smooth_iterations=preset.mesh_smooth_iterations,
            )

            # Try to get silhouette-based measurements for the builder
            silhouette_measurements = self._get_silhouette_measurements(
                frames, height_cm, weight_kg, gender, preset
            )

            mesh = builder.build(
                height_cm=height_cm,
                weight_kg=weight_kg,
                measurements=silhouette_measurements,
                gender=gender,
            )
            del builder
            _cleanup()

            if mesh is None or len(mesh.vertices) == 0:
                raise RuntimeError("AnatomicalMeshBuilder returned empty mesh")

            # Texture from video
            mesh = self._texture(mesh, frames, height_cm)

            glb_path = os.path.join(res_dir, 'body_mesh.glb')
            mesh.export(glb_path)
            logger.info("Anatomical mesh saved: %s (%d verts)", glb_path, len(mesh.vertices))

            smpl_params = {}
            return True, glb_path, smpl_params

        except Exception as e:
            logger.warning("AnatomicalMeshBuilder failed: %s — falling back to SMPL", e)
            return self._fallback_mesh(frames, res_dir, height_cm, weight_kg,
                                        gender, preset)

    def _get_silhouette_measurements(self, frames, height_cm, weight_kg, gender, preset):
        """Get measurements from silhouettes using existing SMPLReconstructor logic."""
        try:
            from .smpl_reconstructor import SMPLReconstructor
            recon = SMPLReconstructor()
            recon.correct_angles(frames)
            sil = recon._analyze_silhouettes(
                frames, height_cm,
                front_side_frames=preset.front_side_frames
            )
            del recon
            _cleanup()
            return sil.get('measurements')
        except Exception as e:
            logger.debug("Silhouette measurement extraction failed: %s", e)
            return None

    def _fallback_mesh(self, frames, res_dir, height_cm, weight_kg, gender, preset):
        """Fallback to the existing SMPL-inspired reconstructor."""
        try:
            from .smpl_reconstructor import SMPLReconstructor
            recon = SMPLReconstructor()
            ok, path, params = recon.fit(
                frames, height_cm, weight_kg, gender,
                os.path.join(res_dir, 'body_mesh.glb'), preset
            )
            del recon
            _cleanup()
            return ok, path, params
        except Exception as e:
            logger.error("Fallback mesh also failed: %s", e)
            return False, None, {}

    def _texture(self, mesh, frames, height_cm):
        """Smart Texturing: Blends colors weighting by view-angle to prevent smearing."""
        valid = [f for f in frames if f.get('body_detected')]
        if not valid:
            return mesh

        # Pick 8 most representative angles for a full 360 wrap
        selected_frames = []
        for target_angle in [0, 45, 90, 135, 180, 225, 270, 315]:
             closest = min(valid, key=lambda f: min(
                 abs((f.get('rotation_angle', 0) % 360) - target_angle),
                 360 - abs((f.get('rotation_angle', 0) % 360) - target_angle)
             ))
             if closest not in selected_frames:
                 selected_frames.append(closest)
                 
        colors_accum = np.zeros((len(mesh.vertices), 3), dtype=np.float64)
        weights_accum = np.zeros(len(mesh.vertices), dtype=np.float64)

        if not hasattr(mesh, 'vertex_normals'):
            mesh.fix_normals()
        normals = mesh.vertex_normals

        for frame in selected_frames:
            try:
                img = cv2.imread(frame['path'])
                if img is None: continue
                h, w = img.shape[:2]
                
                # Camera angle in radians
                rad = np.radians(frame.get('rotation_angle', 0))
                cos_a, sin_a = np.cos(rad), np.sin(rad)
                
                # Camera ray direction in mesh local space (assuming rotation around Y axis)
                cam_dir = np.array([sin_a, 0, cos_a])
                
                # Dot product of vertex normal and camera ray (determines if facing camera)
                # 1.0 = looking straight at camera, <= 0 = facing away
                facing = np.dot(normals, cam_dir)
                
                verts = mesh.vertices
                # Simple orthographic projection
                x_rot = verts[:, 0] * cos_a - verts[:, 2] * sin_a
                
                bounds = mesh.bounds
                sx = w / (bounds[1][0] - bounds[0][0] + 1e-6)
                sy = h / (bounds[1][1] - bounds[0][1] + 1e-6)
                
                u = ((x_rot - bounds[0][0]) * sx).astype(int)
                v = ((-verts[:, 1] + bounds[1][1]) * sy).astype(int)
                
                ok = (u >= 0) & (u < w) & (v >= 0) & (v < h)
                
                mask = frame.get('mask')
                for i in np.where(ok)[0]:
                    if facing[i] < 0.2: # Ignore vertices facing away or at grazing angles
                        continue
                        
                    if mask is not None and mask[v[i], u[i]] == 0:
                        continue
                        
                    color = img[v[i], u[i]][::-1] # BGR to RGB
                    weight = facing[i] ** 2 # Square the weight to strongly prefer direct facing
                    
                    colors_accum[i] += color * weight
                    weights_accum[i] += weight
            except Exception as e:
                logger.warning("Texture warning: %s", e)
                continue

        # Output assignment
        final_colors = np.zeros((len(mesh.vertices), 4), dtype=np.uint8)
        has_color = weights_accum > 0
        
        if np.any(has_color):
            final_colors[has_color, :3] = (colors_accum[has_color] / weights_accum[has_color, None]).astype(np.uint8)
            
        final_colors[~has_color, :3] = [200, 180, 160] # Default skin/clay color
        final_colors[:, 3] = 255
        
        mesh.visual.vertex_colors = final_colors
        return mesh

    # ─── Morphology / Fashion wrappers ───────

    def _morphology(self, frames, measurements, height_cm, weight_kg):
        try:
            from .morphology_analyzer import MorphologyAnalyzer
            return MorphologyAnalyzer().analyze(frames, measurements, height_cm, weight_kg)
        except Exception:
            return {
                'silhouette': {'type': 'normal', 'type_fr': 'Normal',
                               'description': 'Silhouette équilibrée', 'confidence': 0.5},
                'proportions': {'torso_to_legs_ratio': 0.65,
                                'proportion_type': {'type': 'balanced', 'fr': 'Équilibré'}},
                'posture': {'type': 'unknown', 'type_fr': 'Non analysée', 'issues': []},
                'quality_score': 0.5,
            }

    def _fashion(self, measurements, morphology, gender, cut_pref, age):
        try:
            from .fashion_intelligence import FashionIntelligence
            return FashionIntelligence().analyze(
                measurements, morphology, gender=gender,
                user_preference=cut_pref, age=age
            )
        except Exception:
            return {
                'size_recommendations': {'EU': {'recommended_size': 'M', 'confidence': 0.5}},
                'cut_recommendations': {'primary_recommendation': {
                    'style': 'regular_fit', 'name_fr': 'Coupe classique'}},
                'morphological_alerts': [],
            }

    # ─── Beta parameters ────────────────────

    def _beta(self, measurements, morphology):
        try:
            basics = measurements.get('basics', [])
            heights = measurements.get('heights', [])

            chest = next((m['value_cm'] for m in basics if m.get('key') == 'chest'), 95)
            waist = next((m['value_cm'] for m in basics if m.get('key') == 'waist'), 80)
            hips  = next((m['value_cm'] for m in basics if m.get('key') == 'hips'), 98)
            h     = next((m['value_cm'] for m in heights if m.get('key') == 'stature'), 175)

            cn = (chest - 95) / 15
            wn = (waist - 80) / 15
            hn = (hips - 98) / 15
            htn = (h - 175) / 15
            bmi = morphology.get('silhouette', {}).get('bmi', 22)
            bn = (bmi - 22) / 5
            rn = (morphology.get('proportions', {}).get('torso_to_legs_ratio', 0.65) - 0.65) / 0.1

            return [round(x, 3) for x in [
                htn, cn, wn, hn, bn, rn,
                (cn - wn) / 2, (hn - wn) / 2,
                np.random.uniform(-0.2, 0.2), np.random.uniform(-0.2, 0.2)
            ]]
        except Exception:
            return [0.0] * 10

    # ─── Error result ────────────────────────

    def _error(self, run_id, msg, hcm, wkg):
        """
        Even on error, produce a parametric mesh + simulated measurements
        so the frontend always has something to display.
        """
        from .body_processor import GeodesicMeasurer

        # Generate a parametric mesh from height/weight alone
        mesh_url = None
        try:
            import os
            res_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results', run_id)
            os.makedirs(res_dir, exist_ok=True)

            from .anatomical_mesh_builder import AnatomicalMeshBuilder
            builder = AnatomicalMeshBuilder()
            mesh = builder.build(height_cm=hcm, weight_kg=wkg)
            if mesh is not None and len(mesh.vertices) > 0:
                # Apply default skin color
                import numpy as np
                colors = np.full((len(mesh.vertices), 4), [210, 180, 160, 255], dtype=np.uint8)
                mesh.visual.vertex_colors = colors

                glb_path = os.path.join(res_dir, 'body_mesh.glb')
                mesh.export(glb_path)
                mesh_url = f"/results/{run_id}/body_mesh.glb"
                logger.info("Error-path parametric mesh saved: %s (%d verts)", glb_path, len(mesh.vertices))
        except Exception as e:
            logger.warning("Could not generate error-path mesh: %s", e)

        measurements = GeodesicMeasurer()._get_simulated_measurements(hcm, wkg)
        morphology = self._morphology([], measurements, hcm, wkg)
        fashion = self._fashion(measurements, morphology, 'men', None, None)

        result = {
            'id': run_id,
            'status': 'completed',
            'warning': msg,
            'measurements': measurements,
            'morphology': morphology,
            'morphology_type': morphology.get('silhouette', {}).get('shape_letter'),
            'morphology_category': morphology.get('silhouette', {}).get('morphology_category'),
            'fashion_recommendations': fashion,
            'mesh_path': mesh_url,
            'mesh_url': mesh_url,
            'quality_score': 0.0,
            'confidence': 0.3,
            'frames_data': [],
            'frames_used': 0,
            'total_frames': 0,
        }

        # Save result.json
        try:
            import json
            result_path = os.path.join(res_dir, 'result.json')
            with open(result_path, 'w', encoding='utf-8') as fp:
                json.dump(result, fp, indent=2, ensure_ascii=False)
        except Exception:
            pass

        return result

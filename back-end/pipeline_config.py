"""
Pipeline configuration - Quality presets for speed vs 3D precision.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class PipelinePreset:
    """Preset for pipeline behavior."""
    name: str
    target_frames: int          # Frames to extract (0 = all, 36/72/120 typical)
    max_image_height: int      # Resize frames to this max height (px)
    segment_workers: int        # Parallel workers for segmentation (1 = sequential)
    pose_sample_step: int       # Skeleton: 1 every N valid frames (1 = all)
    pose_max_frames: int        # Max frames for pose analysis
    mesh_resolution_height: int # Parametric mesh slices along body
    mesh_resolution_radial: int  # Points per cross-section
    mesh_smooth_iterations: int # Laplacian smoothing passes
    geodesic_slices: int        # Slices for perimeter extraction from mesh
    front_side_frames: int      # Frames to use for front/side silhouette averaging

# Presets: trade-off speed vs precision
PRESET_FAST = PipelinePreset(
    name="fast",
    target_frames=36,
    max_image_height=384,
    segment_workers=2,
    pose_sample_step=2,
    pose_max_frames=30,
    mesh_resolution_height=80,
    mesh_resolution_radial=48,
    mesh_smooth_iterations=2,
    geodesic_slices=100,
    front_side_frames=8,
)

PRESET_BALANCED = PipelinePreset(
    name="balanced",
    target_frames=72,
    max_image_height=512,
    segment_workers=4,
    pose_sample_step=1,
    pose_max_frames=60,
    mesh_resolution_height=120,
    mesh_resolution_radial=72,
    mesh_smooth_iterations=3,
    geodesic_slices=150,
    front_side_frames=16,
)

PRESET_HIGH = PipelinePreset(
    name="high",
    target_frames=0,            # 0 = All frames (no subsampling)
    max_image_height=640,
    segment_workers=8,
    pose_sample_step=1,         # Analyze every frame
    pose_max_frames=0,          # 0 = Unlimited pose analysis
    mesh_resolution_height=300,
    mesh_resolution_radial=128,
    mesh_smooth_iterations=8,
    geodesic_slices=300,
    front_side_frames=0,        # 0 = Use all valid frames for sizing
)

def get_preset(quality: Optional[str] = None) -> PipelinePreset:
    """Return preset by name. Default: balanced."""
    if quality == "fast":
        return PRESET_FAST
    if quality == "high":
        return PRESET_HIGH
    return PRESET_BALANCED

"""
Video Preprocessor — Scale input video to 720p @ 5 FPS max.

Reduces frame count and resolution BEFORE the heavy ML pipeline,
preventing server timeouts (Error 500) on constrained hardware.
"""

import os
import cv2
import logging
import numpy as np
from typing import List, Dict, Optional

from .checkpoint_manager import save_checkpoint, load_checkpoint, checkpoint_exists, vram_cleanup

logger = logging.getLogger(__name__)

# Limits
MAX_HEIGHT = 720          # px  — scale down to 720p
MAX_FPS = 5.0             # fps — subsample to avoid timeouts
MAX_FRAMES = 150          # absolute cap on extracted frames
JPEG_QUALITY = 92         # quality for saved frames


class VideoPreprocessor:
    """
    Step 0 of the hybrid pipeline.
    
    Reads a video file and produces a folder of JPEG frames at reduced
    resolution and frame-rate, ready for downstream ML modules.
    """

    def __init__(self, max_height: int = MAX_HEIGHT, max_fps: float = MAX_FPS,
                 max_frames: int = MAX_FRAMES):
        self.max_height = max_height
        self.max_fps = max_fps
        self.max_frames = max_frames

    def preprocess(self, video_path: str, checkpoint_dir: str) -> Dict:
        """
        Preprocess a video file.

        Args:
            video_path: Path to the input video.
            checkpoint_dir: Directory for checkpoints (frames saved here).

        Returns:
            Dict with keys:
              - frame_paths: List[str] of absolute paths to JPEG frames
              - original_fps: float
              - original_resolution: (w, h)
              - output_fps: float
              - output_resolution: (w, h)
              - num_frames: int
        """
        # ── Check for cached result ──
        cached = load_checkpoint("video_meta", checkpoint_dir)
        frames_dir = os.path.join(checkpoint_dir, "frames")
        if cached is not None and os.path.isdir(frames_dir):
            frame_files = sorted([
                os.path.join(frames_dir, f)
                for f in os.listdir(frames_dir) if f.endswith(".jpg")
            ])
            if len(frame_files) == cached.get("num_frames", 0):
                logger.info("VideoPreprocessor: using cached %d frames", len(frame_files))
                cached["frame_paths"] = frame_files
                return cached

        # ── Open video ──
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_s = total_frames / orig_fps if orig_fps > 0 else 0

        logger.info(
            "VideoPreprocessor: %s — %dx%d @ %.1f fps, %d frames (%.1fs)",
            os.path.basename(video_path), orig_w, orig_h, orig_fps, total_frames, duration_s
        )

        # ── Compute output parameters ──
        out_fps = min(orig_fps, self.max_fps)
        frame_step = max(1, int(round(orig_fps / out_fps)))

        # Scale factor
        if orig_h > self.max_height:
            scale = self.max_height / orig_h
        else:
            scale = 1.0
        out_w = int(orig_w * scale)
        out_h = int(orig_h * scale)
        # Ensure even dimensions (required by many encoders)
        out_w = out_w if out_w % 2 == 0 else out_w + 1
        out_h = out_h if out_h % 2 == 0 else out_h + 1

        logger.info(
            "VideoPreprocessor: output %dx%d @ %.1f fps (step=%d, scale=%.2f)",
            out_w, out_h, out_fps, frame_step, scale
        )

        # ── Extract frames ──
        os.makedirs(frames_dir, exist_ok=True)
        frame_paths = []
        frame_idx = 0
        saved_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_step == 0 and saved_count < self.max_frames:
                # Resize if needed
                if scale < 1.0:
                    frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)

                # Save
                fname = f"frame_{saved_count:04d}.jpg"
                fpath = os.path.join(frames_dir, fname)
                cv2.imwrite(fpath, frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                frame_paths.append(os.path.abspath(fpath))
                saved_count += 1

            frame_idx += 1

        cap.release()
        logger.info("VideoPreprocessor: extracted %d frames to %s", saved_count, frames_dir)

        # ── Save metadata checkpoint ──
        meta = {
            "original_fps": orig_fps,
            "original_resolution": [orig_w, orig_h],
            "output_fps": out_fps,
            "output_resolution": [out_w, out_h],
            "num_frames": saved_count,
            "frame_step": frame_step,
            "scale": scale,
        }
        save_checkpoint(meta, "video_meta", checkpoint_dir)

        meta["frame_paths"] = frame_paths
        return meta

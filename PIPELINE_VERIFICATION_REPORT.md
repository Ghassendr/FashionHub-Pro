# 3D Model Pipeline — Verification Report

**Date:** 2026-02-22  
**Scope:** Video → 3D mesh + body measurements pipeline

---

## Pipeline Flow (Verified)

```
Video Upload (POST /api/client/videos/process)
    ↓
1. Frame Extraction (FrameExtractor)
   - OpenCV reads video, samples frames uniformly across 360°
   - Writes frames/frame_XXX.jpg, assigns rotation angles
   ↓
2. Silhouette Segmentation (SilhouetteExtractor)
   - MediaPipe Selfie Segmenter (models/selfie_segmenter.tflite)
   - Body mask per frame, parallel workers
   ↓
3. Skeleton Landmarks (SkeletonExtractor)
   - MediaPipe Pose (models/pose_landmarker_full.task)
   - 2D/3D keypoints for mesh fitting
   ↓
4. Mesh Reconstruction
   - Primary: AnatomicalMeshBuilder (CPU, anatomical mesh)
   - Fallback: SMPLReconstructor (SMPL-based)
   - Output: body_mesh.glb
   ↓
5. Measurements (GeodesicMeasurer)
   - Perimeter/widths from mesh or simulated from height/weight
   ↓
6. Morphology + Fashion (MorphologyAnalyzer, FashionIntelligence)
   - Body shape classification, recommendations
   ↓
result.json + body_mesh.glb saved to results/<run_id>/
```

---

## Errors Found & Fixed

### 1. `list_runs` — Wrong result field (FIXED)
- **Issue:** `views.list_runs` read `result.get("input", {})` for height/weight.
- **Cause:** Pipeline writes `user_input`, not `input`.
- **Fix:** Use `result.get("user_input") or result.get("input", {})`.

### 2. `get_run_status` — Progress always 0 (FIXED)
- **Issue:** Progress set to 100 only when `status == "success"`.
- **Cause:** Pipeline writes `status: "completed"`.
- **Fix:** Treat both `"success"` and `"completed"` as completed.

### 3. `vite.config.js` — Merge conflict + wrong proxy (FIXED)
- **Issue:** Unresolved Git merge conflict; `/process` proxied to root.
- **Cause:** Django API is at `/api/client/videos/process`, not `/process`.
- **Fix:** Resolved conflict, added `rewrite` so `/process` → `/api/client/videos/process` and `/results` → `/api/client/results/...`.

---

## Configuration Notes

| Item | Value |
|------|-------|
| Backend port | 8000 (Django default) |
| Frontend port | 5173 |
| Pipeline root | `backend/actors/client/ml_pipeline/` |
| Results dir | `backend/actors/client/ml_pipeline/results/` |
| Models | `models/selfie_segmenter.tflite`, `models/pose_landmarker_full.task` ✓ |

---

## How to Run

```bash
# Backend (from project root)
cd backend
python manage.py runserver 8000

# Frontend (from project root)
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## Frontend Entry Points

- **`src/components/Upload.jsx`** — Uses relative `/process` (Vite proxy rewrites to `/api/client/videos/process`).
- **`src/actors/client/components/Upload.jsx`** — Uses hardcoded `http://localhost:8000/api/client/videos/process`.

Both work if the backend runs on port 8000.

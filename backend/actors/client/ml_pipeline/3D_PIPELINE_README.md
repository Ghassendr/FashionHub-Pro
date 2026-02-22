# 3D Body Reconstruction Pipeline: How It Works & How to Improve It

This document explains the step-by-step process of how your Machine Learning pipeline takes a video and turns it into a 3D body mesh with accurate measurements, as orchestrated by the `sequential_pipeline.py` script. It also outlines key areas to fix or improve to get high-quality couture results.

---

## 🏗️ 1. The Current ML Pipeline: Step-by-Step

The pipeline runs completely sequentially to save RAM/VRAM, doing heavy garbage collection between each of the following 6 steps:

### Step 1: Video Frame Extraction (`FrameExtractor`)
- Takes the inputted video of the user (who should be doing a 360 spin).
- Extracts a set number of frames (based on the `quality` preset, e.g., 30 or 60 frames).
- Resizes them to maintain memory efficiency while preserving enough detail for analysis.

### Step 2: Silhouette Segmentation (`SilhouetteExtractor`)
- Analyzes each extracted frame to separate the human body from the background.
- It generates a binary mask (silhouette) of the person.
- *Goal: Provide clean outlines to calculate body widths and heights.*

### Step 3: Skeleton & Landmark Detection (`SkeletonExtractor`)
- Detects the 2D/3D skeletal joints (like shoulders, elbows, hips, knees) in the frames.
- *Goal: Understand the posture and exact positions of bodily pivot points.*

### Step 4: 3D Anatomical Mesh Construction (`AnatomicalMeshBuilder` & `SMPLReconstructor`)
- **Primary Method:** Tries to use the `AnatomicalMeshBuilder` building a completely custom mesh based on the silhouette boundaries and height/weight data.
- **Texture Mapping:** It projects the colors from the front and side video frames directly onto the vertices of the 3D mesh so it looks like the user.
- **Fallback:** If the custom builder fails, it falls back to a standard `SMPLReconstructor` which fits a generic parametric body model to the detected skeleton.

### Step 5: Geodesic Measurements (`GeodesicMeasurer`)
- Wraps virtual "tape measures" around the generated 3D mesh.
- Calculates highly specific couture measurements (chest circumference, waist, hips, inseam, etc.) by traversing the surface of the 3D topology.

### Step 6: Morphology & Fashion AI (`MorphologyAnalyzer` & `FashionIntelligence`)
- Computes body ratios (e.g., Torso-to-Legs). 
- Categorizes the body type (e.g., Rectangle, Triangle, Hourglass).
- Generates tailored fashion recommendations based on the user's measurements and the chosen cut preferences.

---

## 🛠️ 2. How to Fix and Improve the Results

If you are getting bad 3D meshes or inaccurate measurements, you need to fix the pipeline at **the specific step that is failing**. Here is the master checklist for getting high-quality results:

### A. The Input Video (The most common cause of bad results)
AI can only reconstruct what it can clearly see. 
- **Lighting:** The video must be well-lit. Shadows trick the Silhouette Extractor (Step 2) into thinking background objects are part of the body.
- **Clothing:** The user MUST wear tight-fitting clothing. If they wear a baggy shirt, the ML pipeline will reconstruct the *shirt's volume* as their *actual body volume*, ruining all measurements.
- **Complete Rotation:** The user needs to slowly do a full 360-degree A-pose turn so the camera sees the true depth of the chest and back.

### B. Upgrading the Silhouette Segmentation (Step 2)
If the 3D mesh has weird spikes or missing chunks, the background removal is failing.
- **Fix:** Ensure your `SilhouetteExtractor` uses a robust modern model like `MediaPipe Selfie Segmentation` or `Rembg` (U-2-Net).
- **Test:** Look at the intermediate mask images saved during extraction. If the masks look deformed, the 3D mesh will be deformed.

### C. Skeleton Posture Correction (Step 3)
If the mesh looks squashed or tilted, the landmark detection is misinterpreting the camera angle.
- **Fix:** In `smpl_reconstructor.py`, ensure the camera calibration (Focal Length / FOV) assumes a phone camera (~60-70 degree FOV) rather than an orthographic projection. 
- Ensure that you are normalizing the user's root joint (pelvis) to the center of the scene before generating the 3D mesh.

### D. The `AnatomicalMeshBuilder` Topology (Step 4)
If the mesh looks too "blocky" or doesn't look human:
- **Resolution:** Increase the `n_radial` or `mesh_smooth_iterations` in your Preset configuration to add more polygons to the mesh naturally.
- **Fallback reliance:** If you notice your logs saying `AnatomicalMeshBuilder failed — falling back to SMPL`, you have a bug in the custom builder that is forcing it to output low-quality generic SMPL models. Inspect the `try/except` block in `_build_mesh` inside `sequential_pipeline.py`.

### E. Vertex Texturing (Step 4)
If the skin/clothing colors on the 3D mesh look blurry or smeared across the sides:
- **Fix:** The current `_texture()` function uses simple vertex projection. For high-quality couture visuals, you should upgrade this step to use **UV Unwrapping** combined with OpenCV `inpaint` to blend the front and back photos together smoothly onto a texture map (`.png`), rather than just coloring individual vertices.

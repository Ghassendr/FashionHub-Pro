# Client Actor - 3D Reconstruction ID System

## Overview

The **3D reconstruction ID** (`run_id`) in the client actor is a unique identifier for each body measurement analysis run. It tracks the entire pipeline from video upload through 3D mesh generation, measurements, and recommendations.

---

## ID Generation & Structure

### **ID Format**
```python
run_id = str(uuid.uuid4())[:8]
```

- **Type**: UUID v4 converted to string, truncated to 8 characters
- **Example**: `a1b2c3d4`, `f9e8d7c6`
- **Uniqueness**: 4,294,967,296 possible combinations (2^32)
- **Generated**: In `body_processor.py` process() method, line 47

### **Generated URL Format**
```
/results/{run_id}/body_mesh.glb
/results/{run_id}/model_overlay.mp4
/results/{run_id}/result.json
/results/{run_id}/frames/
```

**Example**:
```
/results/a1b2c3d4/body_mesh.glb
/results/a1b2c3d4/result.json
```

---

## Directory Structure per Run

```
backend/3d_model_body_measurements/results/
└── {run_id}/                          # e.g., "a1b2c3d4"
    ├── result.json                    # Final result data
    ├── body_mesh.glb                  # 3D SMPL mesh (glTF binary format)
    ├── model_overlay.mp4              # Video with 3D model overlay
    ├── extraction_debug.jpg           # Debug visualization
    ├── frames/                        # Extracted video frames
    │   ├── frame_000.jpg
    │   ├── frame_001.jpg
    │   └── ...
    └── smpl_params.json               # SMPL shape/pose parameters (optional)
```

---

## ID Storage in Frontend State

### **React State (BodyMeasurements.jsx)**
```javascript
const [result, setResult] = useState(null);

// After API response:
// result = {
//   id: "a1b2c3d4",
//   mesh_url: "http://localhost:8000/results/a1b2c3d4/body_mesh.glb",
//   overlay_video_url: "http://localhost:8000/results/a1b2c3d4/model_overlay.mp4",
//   measurements: { ... },
//   morphology: { ... },
//   fashion_recommendations: { ... }
// }
```

### **Recommended Context Structure (Future)**
```javascript
// actors/client/context/MeasurementContext.jsx
const [measurements, setMeasurements] = useState({
  runs: {
    'a1b2c3d4': {
      id: 'a1b2c3d4',
      timestamp: 1708012800,
      video_file: 'user_video.mp4',
      body_mesh_url: '/results/a1b2c3d4/body_mesh.glb',
      measurements: { ... },
      morphology: { ... },
      status: 'completed'
    }
  },
  current_run_id: 'a1b2c3d4'
});
```

---

## API Endpoints by run_id

### **Client API (Legacy - Current)**
```
POST /process
  {
    video: File,
    height: 175,
    weight: 75,
    gender: 'men',
    quality: 'balanced'
  }
  → {
    id: "a1b2c3d4",
    mesh_url: "/results/a1b2c3d4/body_mesh.glb",
    measurements: { ... }
  }

GET /api/measurements/{run_id}
  → Returns measurements for specific run

GET /api/recommendations/{run_id}
  → Returns fashion recommendations for specific run

GET /results/{run_id}/body_mesh.glb
  → Returns 3D mesh file
```

### **New Client API (Ready to Implement)**
```
POST /api/client/videos/upload
  → Creates run_id and starts processing

GET /api/client/measurements/{run_id}
  → Get body measurements by run_id

GET /api/client/recommendations/{run_id}
  → Get sizing recommendations by run_id

GET /api/client/history
  → List all user's measurement runs
```

---

## 3D Reconstruction Pipeline (Using run_id)

```
1. VIDEO UPLOAD
   ├─ POST /process
   ├─ Generate: run_id = "a1b2c3d4"
   └─ Create: /results/a1b2c3d4/

2. FRAME EXTRACTION
   ├─ Extract ~72 frames from video (360° sampling)
   ├─ Resize frames for performance
   └─ Save to: /results/a1b2c3d4/frames/frame_000.jpg

3. SILHOUETTE SEGMENTATION (MediaPipe)
   ├─ Process each frame with selfie segmenter
   ├─ Detect body outline (silhouette)
   └─ Create masks for SMPLify-X hints

4. 2D JOINT EXTRACTION (MediaPipe)
   ├─ Extract 2D joint positions from each frame
   ├─ Used as optimization hints for SMPL
   └─ Data: 33 body landmarks per frame

5. SMPL-X OPTIMIZATION (3D Mesh Fitting)
   ├─ Fit SMPL-X model to:
   │   ├─ 2D joint hints
   │   ├─ Body shape (β parameter) for height/weight
   │   ├─ Pose (θ parameter) for orientation
   │   └─ Gender-specific models
   ├─ Optimize shape consistency across all frames
   └─ Output: SMPL mesh (body_mesh.glb)

6. MEASUREMENT EXTRACTION
   ├─ From final SMPL mesh:
   │   ├─ Body perimeters (chest, waist, hip)
   │   ├─ Segment lengths (torso, limb, joint distances)
   │   └─ Proportions & morphology
   ├─ Calculate confidence scores
   └─ Save to: /results/a1b2c3d4/result.json

7. 3D VISUALIZATION
   ├─ Render mesh in Three.js (Viewer3D)
   ├─ Overlay on video (model_overlay.mp4)
   ├─ Show measurement annotations
   └─ Files: body_mesh.glb, model_overlay.mp4

8. RECOMMENDATIONS
   ├─ AI-generated sizing for different systems (XS-3XL)
   ├─ Cut recommendations (ajusté, normal, large)
   ├─ Confidence scores per recommendation
   └─ Stored in: /results/a1b2c3d4/result.json
```

---

## Result JSON Structure (Persisted by run_id)

**File**: `/results/{run_id}/result.json`

```json
{
  "id": "a1b2c3d4",
  "timestamp": 1708012800,
  "status": "success",
  "processing_time_seconds": 45.2,
  "input": {
    "height_cm": 175,
    "weight_kg": 75,
    "age": 30,
    "gender": "men",
    "quality": "balanced"
  },
  "mesh_url": "/results/a1b2c3d4/body_mesh.glb",
  "overlay_video_url": "/results/a1b2c3d4/model_overlay.mp4",
  "quality_score": 0.92,
  "measurements": {
    "basics": [
      { "name": "Chest", "value_cm": 102.5, "confidence": 0.95 },
      { "name": "Waist", "value_cm": 85.3, "confidence": 0.93 },
      { "name": "Hip", "value_cm": 98.2, "confidence": 0.91 }
    ],
    "heights": [ ... ],
    "widths": [ ... ],
    "functional": [ ... ]
  },
  "morphology": {
    "silhouette": {
      "type": "normal",
      "type_fr": "Normal",
      "bmi": 24.5
    },
    "proportions": {
      "proportion_type": "balanced",
      "torso_to_legs_ratio": 0.62
    },
    "posture": { "type": "straight" }
  },
  "fashion_recommendations": {
    "size_recommendations": {
      "EU": { "recommended_size": "M", "confidence": 0.89 },
      "US": { "recommended_size": "38R", "confidence": 0.87 }
    },
    "cut_recommendations": {
      "primary_recommendation": {
        "name": "Ajusté",
        "description": "Fitted cut for balanced proportions"
      }
    }
  },
  "smpl_params": {
    "beta": [ ... ],  # Shape parameters per axis
    "theta": [ ... ]  # Pose parameters (72 params for SMPL)
  }
}
```

---

## Database Model (Recommended - Phase 2/3)

### **Client App: VideoProcessRun Model**
```python
# actors/client/models/video_process_run.py
class VideoProcessRun(models.Model):
    run_id = models.CharField(max_length=8, unique=True)  # UUID truncated
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # Input parameters
    video_file = models.FileField(upload_to='uploads/')
    height_cm = models.FloatField()
    weight_kg = models.FloatField()
    age = models.IntegerField(null=True)
    gender = models.CharField(max_length=10, choices=[('men', 'Men'), ('women', 'Women')])
    quality_preset = models.CharField(max_length=20, choices=[('fast', 'Fast'), ('balanced', 'Balanced'), ('high', 'High')])

    # Output data
    mesh_url = models.URLField()
    result_json = models.JSONField()
    quality_score = models.FloatField()
    processing_time_seconds = models.FloatField()

    # Status
    status = models.CharField(max_length=20, choices=[('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')])
    error_message = models.TextField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'client_video_process_run'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.run_id} - {self.user.username}"
```

---

## Key Implementation Points

### **Frontend (React)**
1. **Store run_id in state** during processing
2. **Display run_id** in results view (for debugging/sharing)
3. **Fetch by run_id** if user returns to page later
4. **Store in localStorage** for session persistence

### **Backend (Django)**
1. **Index run_id** in database for fast lookup
2. **Validate run_id** format (8 alphanumeric chars)
3. **Implement cleanup** for old runs (configurable retention)
4. **Protect file access** - validate run_id ownership before serving

### **API Contracts**
```javascript
// Request
POST /api/client/videos/upload {
  video: File,
  height_cm: 175,
  weight_kg: 75,
  gender: 'men',
  quality: 'balanced'
}

// Response (Immediate)
{
  run_id: "a1b2c3d4",
  status: "processing"
}

// Status Check
GET /api/client/runs/{run_id}/status → { status, progress }

// Final Result
GET /api/client/runs/{run_id} → { id, mesh_url, measurements, ... }
```

---

## Current File References

| File | Line | Purpose |
|------|------|---------|
| `backend/3d_model_body_measurements/body_processor.py` | 47 | Generate run_id |
| `backend/3d_model_body_measurements/body_processor.py` | 48-50 | Create output directory |
| `backend/3d_model_body_measurements/body_processor.py` | 117-148 | Return result with run_id |
| `backend/bodyapi/views.py` | 58 | POST /process endpoint |
| `backend/bodyapi/views.py` | 108-109 | Result path by run_id |
| `backend/bodyapi/views.py` | 137-146 | GET measurements by run_id |
| `backend/bodyapi/views.py` | 149+ | GET recommendations by run_id |
| `frontend/src/actors/client/pages/BodyMeasurements.jsx` | 44-70 | Upload & receive run_id |
| `frontend/src/actors/client/pages/BodyMeasurements.jsx` | 58-63 | Store run_id in state |

---

## Next Steps (Phase 2)

1. **Create DatabaseModel**
   - Add VideoProcessRun model to `actors/client/models/`
   - Create and run migrations

2. **Implement Service Layer**
   - Move processing logic to `actors/client/services/`
   - Implement run_id persistence
   - Add run history tracking

3. **Create Dedicated API**
   - `/api/client/runs/{run_id}` - Get run details
   - `/api/client/runs/` - List all user runs
   - `/api/client/runs/{run_id}/status` - Poll processing status

4. **Add Frontend Services**
   - Create `actors/client/services/reconstructionService.js`
   - Implement run_id caching and retrieval
   - Add error handling and retry logic

5. **Implement Async Processing**
   - Use Celery/background tasks for long chains
   - Return run_id immediately
   - Poll status endpoint

---

## Security Considerations

1. **Access Control**: User can only access their own run_ids
2. **File Cleanup**: Delete files after retention period
3. **Run ID Validation**: Validate format before database query
4. **Path Traversal**: Never allow run_id in path without validation
5. **API Rate Limiting**: Limit uploads per user per time period

---

**Last Updated**: 2026-02-21
**Status**: Ready for Phase 2 Implementation

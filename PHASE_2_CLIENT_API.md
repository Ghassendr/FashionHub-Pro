# Client Actor - API Implementation (Phase 2)

## Overview

Phase 2 implementation provides the **Client Actor API** (`/api/client/`) with complete RESTful endpoints for 3D body measurement processing, measurement management, and run history tracking.

**Status**: ✅ Implemented & Validated

---

## API Endpoints

### **1. Video Processing**

#### Upload & Process Video
```
POST /api/client/videos/upload
POST /api/client/videos/process
```

**Both endpoints are equivalent** - upload_video() calls process_video()

**Request** (multipart/form-data):
```javascript
{
  video: File,                    // Required: MP4/MOV video file
  height: 175,                   // Optional: height in cm (default: 175)
  weight: 75,                    // Optional: weight in kg (default: 70)
  age: 30,                       // Optional: age in years
  gender: "men",                 // Optional: "men" or "women" (default: "men")
  cut_preference: "ajusté",      // Optional: "ajusté", "normal", or "large"
  quality: "balanced"            // Optional: "fast", "balanced", or "high" (default: "balanced")
}
```

**Response** (200 success):
```json
{
  "id": "a1b2c3d4",
  "status": "success",
  "mesh_url": "/api/client/results/a1b2c3d4/body_mesh.glb",
  "overlay_video_url": "/api/client/results/a1b2c3d4/model_overlay.mp4",
  "mesh_path": "/results/a1b2c3d4/body_mesh.glb",
  "quality_score": 0.92,
  "processing_time_seconds": 45.2,
  "input": {
    "height_cm": 175,
    "weight_kg": 75,
    "age": 30,
    "gender": "men"
  },
  "measurements": {
    "basics": [...],
    "heights": [...],
    "widths": [...],
    "functional": [...]
  },
  "morphology": {...},
  "fashion_recommendations": {...}
}
```

**Error Response** (400/500):
```json
{
  "error": "No video provided",
  "status": "error"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:8000/api/client/videos/upload \
  -F "video=@video.mp4" \
  -F "height=175" \
  -F "weight=75" \
  -F "gender=men" \
  -F "quality=balanced"
```

---

### **2. Results & File Serving**

#### Serve 3D Mesh / Results
```
GET /api/client/results/{filepath}
GET /api/client/results/{run_id}/body_mesh.glb
GET /api/client/results/{run_id}/model_overlay.mp4
GET /api/client/results/{run_id}/result.json
```

**Response**: Binary file (GLB, MP4) or JSON data

**Content-Type**:
- `.glb` → `model/gltf-binary`
- `.mp4` → `video/mp4`
- `.json` → `application/json`
- Others → `application/octet-stream`

**Example**:
```bash
curl -O http://localhost:8000/api/client/results/a1b2c3d4/body_mesh.glb
```

---

### **3. Measurements**

#### Get Measurements by Run ID
```
GET /api/client/measurements/{run_id}
```

**Response** (200):
```json
{
  "basics": [
    {
      "key": "chest",
      "name": "Chest Circumference",
      "value_cm": 102.5,
      "value": "102.5",
      "confidence": 0.95,
      "corrected": false
    },
    {
      "key": "waist",
      "name": "Waist Circumference",
      "value_cm": 85.3,
      "confidence": 0.93,
      "corrected": false
    },
    ...
  ],
  "heights": [...],
  "widths": [...],
  "functional": [...]
}
```

**Error** (404):
```json
{
  "error": "Run a1b2c3d4 not found"
}
```

---

### **4. Recommendations**

#### Get Fashion Recommendations
```
GET /api/client/recommendations/{run_id}
```

**Response** (200):
```json
{
  "size_recommendations": {
    "EU": {
      "recommended_size": "M",
      "confidence": 0.89,
      "size_range": "M to L"
    },
    "US": {
      "recommended_size": "38R",
      "confidence": 0.87
    },
    "UK": {
      "recommended_size": "12",
      "confidence": 0.88
    }
  },
  "cut_recommendations": {
    "primary_recommendation": {
      "name": "Ajusté",
      "name_fr": "Coupe Ajustée",
      "description": "Fitted cut for balanced proportions",
      "confidence": 0.90
    },
    "alternative_recommendations": [...]
  }
}
```

---

### **5. Measurement Correction**

#### Correct a Measurement
```
POST /api/client/correct/{run_id}
```

**Request** (JSON):
```json
{
  "measurement_key": "chest",
  "new_value": 105.0
}
```

**Response** (200):
```json
{
  "success": true,
  "result": {
    "id": "a1b2c3d4",
    "measurements": {
      "basics": [
        {
          "key": "chest",
          "name": "Chest Circumference",
          "value_cm": 105.0,
          "corrected": true,
          "confidence": 1.0
        },
        ...
      ]
    },
    ...
  }
}
```

**Error Response** (404):
```json
{
  "error": "Measurement chest not found"
}
```

**Example with cURL**:
```bash
curl -X POST http://localhost:8000/api/client/correct/a1b2c3d4 \
  -H "Content-Type: application/json" \
  -d '{
    "measurement_key": "chest",
    "new_value": 105.0
  }'
```

---

### **6. Run History**

#### List All Runs
```
GET /api/client/runs/
```

**Response** (200):
```json
{
  "runs": [
    {
      "id": "a1b2c3d4",
      "timestamp": "2026-02-21T10:30:00",
      "height": 175,
      "weight": 75,
      "status": "success",
      "quality_score": 0.92
    },
    {
      "id": "f9e8d7c6",
      "timestamp": "2026-02-21T09:15:30",
      "height": 180,
      "weight": 80,
      "status": "success",
      "quality_score": 0.88
    }
  ],
  "count": 2,
  "timestamp": "2026-02-21T10:35:00"
}
```

---

#### Get Run Details
```
GET /api/client/runs/{run_id}
```

**Response** (200): Complete result.json content
```json
{
  "id": "a1b2c3d4",
  "timestamp": 1708012000,
  "status": "success",
  "mesh_url": "/api/client/results/a1b2c3d4/body_mesh.glb",
  "overlay_video_url": "/api/client/results/a1b2c3d4/model_overlay.mp4",
  "quality_score": 0.92,
  "processing_time_seconds": 45.2,
  "input": {...},
  "measurements": {...},
  "morphology": {...},
  "fashion_recommendations": {...},
  "smpl_params": {...}
}
```

---

#### Get Run Status
```
GET /api/client/runs/{run_id}/status
```

**Response** (200):
```json
{
  "id": "a1b2c3d4",
  "status": "success",
  "progress": 100,
  "processing_time": 45.2,
  "quality_score": 0.92,
  "timestamp": "2026-02-21T10:30:00"
}
```

**Status Values**:
- `"success"` - Processing completed successfully
- `"processing"` - Currently processing (future async implementation)
- `"error"` - Processing failed
- `"unknown"` - Status could not be determined

---

### **7. Health Check**

#### API Health Status
```
GET /api/client/health
```

**Response** (200):
```json
{
  "status": "healthy",
  "service": "client-actor",
  "version": "1.0-modular",
  "timestamp": "2026-02-21T10:35:00",
  "modules": {
    "processor": true,
    "morphology": true,
    "fashion": true,
    "3d_reconstruction": true
  }
}
```

---

## URL Routing Summary

| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| POST | `/api/client/videos/upload` | `upload_video()` | Upload & process video |
| POST | `/api/client/videos/process` | `process_video()` | Same as upload |
| GET | `/api/client/results/<path>` | `serve_results()` | Serve mesh/video/JSON files |
| GET | `/api/client/measurements/{run_id}` | `get_measurements()` | Get measurements data |
| GET | `/api/client/recommendations/{run_id}` | `get_recommendations()` | Get sizing recommendations |
| POST | `/api/client/correct/{run_id}` | `correct_measurements()` | Manually correct measurement |
| GET | `/api/client/runs/` | `list_runs()` | List all measurement runs |
| GET | `/api/client/runs/{run_id}` | `get_run_details()` | Get complete run data |
| GET | `/api/client/runs/{run_id}/status` | `get_run_status()` | Get run processing status |
| GET | `/api/client/health` | `health_check()` | API health/status |

---

## Implementation Details

### File Structure
```
backend/actors/client/api/
├── __init__.py
├── urls.py                    # URL routing (10 patterns)
├── views.py                   # 10 view functions (400+ lines)
├── serializers.py             # Request/response validation (ready for Phase 3)
└── apps.py                    # Django app config
```

### Key Features

1. **Video Processing**
   - Supports multipart file uploads
   - Validates form parameters
   - Delegates to existing BodyProcessor pipeline
   - Returns structured 3D reconstruction data

2. **File Serving**
   - Serves 3D mesh files (.glb - glTF binary)
   - Serves overlay videos (.mp4)
   - Serves JSON results
   - Proper MIME types and CORS headers

3. **Measurements API**
   - Retrieves measurements by run_id
   - Supports manual measurement corrections
   - Tracks confidence scores and corrections

4. **Recommendations Engine**
   - AI-generated sizing (XS-3XL, EU/US/UK)
   - Cut recommendations (ajusté, normal, large)
   - Confidence scores per recommendation

5. **Run History**
   - List all processing runs
   - Retrieve complete run details
   - Poll processing status
   - Query by run_id

6. **Health Monitoring**
   - Service health status
   - Module availability (processor, morphology, fashion, 3D)
   - API version info
   - Timestamp of health check

### Configuration

**Enabled in**: `backend/config/urls.py` (line 15)
```python
path("api/client/", include("actors.client.api.urls")),
```

**INSTALLED_APPS**: `backend/config/settings.py` (line 24)
```python
"actors.client",
```

### Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `404` - Resource not found (run_id doesn't exist)
- `405` - Method not allowed
- `500` - Server error (processing failed)

JSON error format:
```json
{
  "error": "Human readable error message",
  "status": "error"  // Optional
}
```

---

## Backward Compatibility

**Legacy endpoints still work** at the same paths:
- `POST /process` → Same as `/api/client/videos/process`
- `GET /results/<path>` → Same as `/api/client/results/<path>`
- `GET /api/measurements/{run_id}` → Same as `/api/client/measurements/{run_id}`
- `GET /api/recommendations/{run_id}` → Same as `/api/client/recommendations/{run_id}`
- `GET /health` → Use `/api/client/health` (new endpoint)

This ensures zero disruption to existing clients while providing new structured API.

---

## Frontend Integration (Ready)

Frontend can now use structured API paths:

```javascript
// Upload video
const formData = new FormData();
formData.append('video', videoFile);
formData.append('height', 175);
formData.append('weight', 75);

const response = await fetch('/api/client/videos/upload', {
  method: 'POST',
  body: formData
});
const result = await response.json();
const { id, mesh_url, measurements } = result;

// Get measurements
const measurements = await fetch(`/api/client/measurements/${id}`)
  .then(r => r.json());

// Get recommendations
const recommendations = await fetch(`/api/client/recommendations/${id}`)
  .then(r => r.json());

// Correct measurement
await fetch(`/api/client/correct/${id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ measurement_key: 'chest', new_value: 105.0 })
});

// Get run history
const runs = await fetch('/api/client/runs/')
  .then(r => r.json());
```

---

## Next Steps (Phase 3)

1. **Serializers Implementation**
   - Create `actors/client/api/serializers.py`
   - Request validation (VideoUploadSerializer, CorrectionSerializer)
   - Response serialization (MeasurementSerializer, RecommendationSerializer)

2. **Service Layer**
   - Extract business logic to `actors/client/services/`
   - Create: `video_processor_service.py`, `measurement_service.py`
   - Improve separation of concerns

3. **Delivery Actor API**
   - Mirror client structure for delivery actor
   - Create `/api/delivery/` endpoints for logistics
   - Routes (CRUD), Orders, Vehicles, Schedules

4. **Database Integration**
   - Create VideoProcessRun model (actors/client/models/)
   - Migrate from file-based to database storage
   - Add user/ownership tracking

5. **Async Processing**
   - Celery for background task processing
   - Return run_id immediately, poll status endpoint
   - Long-running processing on workers

---

## Testing

**Quick Validation:**
```bash
# Check health
curl http://localhost:8000/api/client/health

# List runs
curl http://localhost:8000/api/client/runs/

# Upload video
curl -X POST http://localhost:8000/api/client/videos/upload \
  -F "video=@test.mp4" -F "height=175" -F "weight=75"
```

Django Configuration Check:
```bash
python manage.py check
# System check identified no issues (0 silenced).
```

---

## File References

| File | Lines | Purpose |
|------|-------|---------|
| `backend/actors/client/api/urls.py` | 26 | URL routing (10 patterns) |
| `backend/actors/client/api/views.py` | 434 | View functions (10 endpoints) |
| `backend/config/urls.py` | 15 | Enable client API routes |
| `backend/config/settings.py` | 24 | Register actors.client app |

---

**Last Updated**: 2026-02-21
**Status**: Phase 2 Complete ✅
**Next**: Phase 3 - Service Layer & Delivery API

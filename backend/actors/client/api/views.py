import json
import logging
import os
from pathlib import Path
from typing import Any
from datetime import datetime

from django.conf import settings
from django.http import JsonResponse, FileResponse, HttpRequest, HttpResponseNotFound
from django.views.decorators.csrf import csrf_exempt

import importlib
body_processor_mod = importlib.import_module("actors.client.ml_pipeline.body_processor")
BodyProcessor = body_processor_mod.BodyProcessor


logger = logging.getLogger(__name__)


PIPELINE_ROOT = Path(getattr(settings, "PIPELINE_ROOT", Path(__file__).resolve().parent.parent / "ml_pipeline"))
UPLOAD_FOLDER = Path(getattr(settings, "PIPELINE_UPLOADS", PIPELINE_ROOT / "uploads"))
RESULTS_FOLDER = Path(getattr(settings, "PIPELINE_RESULTS", PIPELINE_ROOT / "results"))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

processor = BodyProcessor()


def _parse_float(value: str | None, default: float) -> float:
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _parse_int(value: str | None) -> int | None:
    try:
        return int(value) if value and value.isdigit() else None
    except (TypeError, ValueError):
        return None


def _result_path(run_id: str) -> Path:
    """Get path to result.json for a given run_id."""
    return RESULTS_FOLDER / run_id / "result.json"


@csrf_exempt
def upload_video(request: HttpRequest):
    """
    Alias for process_video. Handles video upload and initiate processing.
    POST /api/client/videos/upload
    """
    return process_video(request)


@csrf_exempt
def process_video(request: HttpRequest):
    """
    Process a video file and generate 3D body measurements.
    POST /api/client/videos/process or /api/client/videos/upload

    Expected form data:
        - video: Video file (multipart)
        - height: Height in cm (default: 175)
        - weight: Weight in kg (default: 70)
        - age: Age (optional)
        - gender: 'men' or 'women' (default: 'men')
        - cut_preference: 'ajusté', 'normal', or 'large' (optional)
        - quality: 'fast', 'balanced', or 'high' (default: 'balanced')

    Returns:
        {
            "id": "a1b2c3d4",
            "mesh_url": "/api/client/results/a1b2c3d4/body_mesh.glb",
            "status": "success",
            "measurements": {...},
            ...
        }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    video = request.FILES.get("video")
    if not video or not getattr(video, "name", ""):
        return JsonResponse({"error": "No video provided"}, status=400)

    # Parse form data
    height = _parse_float(request.POST.get("height"), 175.0)
    weight = _parse_float(request.POST.get("weight"), 70.0)
    age = _parse_int(request.POST.get("age"))
    gender = request.POST.get("gender", "men")
    cut_preference: str | None = request.POST.get("cut_preference") or None

    quality = (request.POST.get("quality") or "balanced").lower()
    if quality not in ("fast", "balanced", "high"):
        quality = "balanced"

    # Validate inputs
    if gender not in ("men", "women"):
        gender = "men"

    # Save uploaded file
    save_path = UPLOAD_FOLDER / video.name
    with open(save_path, "wb+") as dest:
        for chunk in video.chunks():
            dest.write(chunk)

    logger.info(
        "Client API: Processing video %s | %scm, %skg, age=%s, gender=%s, quality=%s",
        video.name, height, weight, age, gender, quality,
    )

    try:
        result: dict[str, Any] = processor.process(
            str(save_path),
            str(RESULTS_FOLDER),
            height_cm=height,
            weight_kg=weight,
            age=age,
            gender=gender,
            cut_preference=cut_preference,
            quality=quality,
        )

        # Ensure result has required fields
        if result.get("status") != "error":
            result.setdefault("plots", {})

            # Fix mesh_url to use API path
            if result.get("id"):
                result["mesh_url"] = f"/api/client/results/{result['id']}/body_mesh.glb"
                result["overlay_video_url"] = f"/api/client/results/{result['id']}/model_overlay.mp4"

        return JsonResponse(result)
    except Exception as exc:
        logger.exception("Error processing video: %s", exc)
        return JsonResponse({"error": str(exc), "status": "error"}, status=500)


def serve_results(request: HttpRequest, filepath: str):
    """
    Serve result files (meshes, videos, JSON, etc.).
    GET /api/client/results/{run_id}/body_mesh.glb
    GET /api/client/results/{run_id}/result.json
    """
    full_path = RESULTS_FOLDER / filepath

    # If requesting a directory, serve result.json
    if full_path.is_dir():
        result_json = full_path / "result.json"
        if result_json.exists():
            with open(result_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            return JsonResponse(data)
        return JsonResponse({"error": "Result not found"}, status=404)

    # Serve file with proper content type
    if full_path.exists():
        if full_path.suffix == ".glb":
            content_type = "model/gltf-binary"
        elif full_path.suffix == ".mp4":
            content_type = "video/mp4"
        elif full_path.suffix == ".json":
            content_type = "application/json"
        else:
            content_type = "application/octet-stream"

        response = FileResponse(open(full_path, "rb"), content_type=content_type)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "*"
        return response

    logger.warning("File not found: %s", full_path)
    return JsonResponse({"error": "File not found"}, status=404)


def get_measurements(_request: HttpRequest, run_id: str):
    """
    Get body measurements for a specific run.
    GET /api/client/measurements/{run_id}

    Returns:
        {
            "basics": [...],
            "heights": [...],
            "widths": [...],
            "functional": [...]
        }
    """
    path = _result_path(run_id)
    if not path.exists():
        return JsonResponse({"error": f"Run {run_id} not found"}, status=404)

    with open(path, "r", encoding="utf-8") as f:
        result = json.load(f)

    return JsonResponse(result.get("measurements", {}))


def get_recommendations(_request: HttpRequest, run_id: str):
    """
    Get AI fashion recommendations for a specific run.
    GET /api/client/recommendations/{run_id}

    Returns:
        {
            "size_recommendations": {...},
            "cut_recommendations": {...}
        }
    """
    path = _result_path(run_id)
    if not path.exists():
        return JsonResponse({"error": f"Run {run_id} not found"}, status=404)

    with open(path, "r", encoding="utf-8") as f:
        result = json.load(f)

    return JsonResponse(result.get("fashion_recommendations", {}))


@csrf_exempt
def correct_measurements(request: HttpRequest, run_id: str):
    """
    Manually correct measurements for a specific run.
    POST /api/client/correct/{run_id}

    Expected JSON body:
        {
            "measurement_key": "chest",
            "new_value": 102.5
        }

    Returns:
        {
            "success": true,
            "result": {...}
        }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    path = _result_path(run_id)
    if not path.exists():
        return JsonResponse({"error": f"Run {run_id} not found"}, status=404)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    if "measurement_key" not in payload or "new_value" not in payload:
        return JsonResponse({"error": "Invalid correction data"}, status=400)

    with open(path, "r", encoding="utf-8") as f:
        result = json.load(f)

    measurement_key = payload["measurement_key"]
    try:
        new_value = float(payload["new_value"])
    except (TypeError, ValueError):
        return JsonResponse({"error": "Invalid new_value"}, status=400)

    # Update measurement
    found = False
    for category in ["basics", "heights", "widths", "functional"]:
        if category not in result.get("measurements", {}):
            continue
        for m in result["measurements"][category]:
            if m.get("key") == measurement_key or m.get("name").lower() == measurement_key.lower():
                m["value_cm"] = new_value
                m["value"] = f"{new_value:.1f}"
                m["corrected"] = True
                m["confidence"] = 1.0
                found = True
                break

    if not found:
        return JsonResponse({"error": f"Measurement {measurement_key} not found"}, status=404)

    # Save updated result
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info("Corrected measurement %s in run %s to %s cm", measurement_key, run_id, new_value)

    return JsonResponse({"success": True, "result": result})


def list_runs(request: HttpRequest):
    """
    List all measurement runs.
    GET /api/client/runs/

    Returns:
        {
            "runs": [
                {
                    "id": "a1b2c3d4",
                    "timestamp": "2026-02-21T10:30:00Z",
                    "height": 175,
                    "weight": 75,
                    "status": "success"
                },
                ...
            ]
        }
    """
    if not RESULTS_FOLDER.exists():
        return JsonResponse({"runs": [], "count": 0})

    runs = []
    for run_dir in sorted(RESULTS_FOLDER.iterdir(), reverse=True):
        if not run_dir.is_dir():
            continue

        result_file = run_dir / "result.json"
        if result_file.exists():
            try:
                with open(result_file, "r", encoding="utf-8") as f:
                    result = json.load(f)

                user_data = result.get("user_input") or result.get("input", {})
                runs.append({
                    "id": result.get("id", run_dir.name),
                    "timestamp": datetime.fromtimestamp(result_file.stat().st_mtime).isoformat(),
                    "height": user_data.get("height_cm"),
                    "weight": user_data.get("weight_kg"),
                    "status": result.get("status", "unknown"),
                    "quality_score": result.get("quality_score"),
                })
            except Exception as e:
                logger.warning("Error reading run %s: %s", run_dir.name, e)
                continue

    return JsonResponse({
        "runs": runs,
        "count": len(runs),
        "timestamp": datetime.now().isoformat()
    })


def get_run_details(request: HttpRequest, run_id: str):
    """
    Get complete details for a specific run.
    GET /api/client/runs/{run_id}

    Returns: Full result.json content
    """
    path = _result_path(run_id)
    if not path.exists():
        return JsonResponse({"error": f"Run {run_id} not found"}, status=404)

    try:
        with open(path, "r", encoding="utf-8") as f:
            result = json.load(f)

        # Add API URLs if not present
        if result.get("id") and not result.get("mesh_url"):
            result["mesh_url"] = f"/api/client/results/{result['id']}/body_mesh.glb"
            result["overlay_video_url"] = f"/api/client/results/{result['id']}/model_overlay.mp4"

        return JsonResponse(result)
    except Exception as e:
        logger.error("Error reading run %s: %s", run_id, e)
        return JsonResponse({"error": "Error reading run data"}, status=500)


def get_run_status(request: HttpRequest, run_id: str):
    """
    Get processing status for a specific run.
    GET /api/client/runs/{run_id}/status

    Returns:
        {
            "id": "a1b2c3d4",
            "status": "success",
            "progress": 100,
            "processing_time": 45.2
        }
    """
    path = _result_path(run_id)
    if not path.exists():
        return JsonResponse({"error": f"Run {run_id} not found"}, status=404)

    try:
        with open(path, "r", encoding="utf-8") as f:
            result = json.load(f)

        status = result.get("status", "unknown")
        progress = 100 if status in ("success", "completed") else 0
        return JsonResponse({
            "id": result.get("id", run_id),
            "status": status,
            "progress": progress,
            "processing_time": result.get("processing_time_seconds"),
            "quality_score": result.get("quality_score"),
            "timestamp": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
        })
    except Exception as e:
        logger.error("Error reading run status %s: %s", run_id, e)
        return JsonResponse({"error": "Error reading run status"}, status=500)


def health_check(_request: HttpRequest):
    """
    Health check for the client API.
    GET /api/client/health

    Returns:
        {
            "status": "healthy",
            "service": "client-actor",
            "version": "1.0-modular",
            "modules": {
                "processor": true,
                "morphology": true,
                "fashion": true
            }
        }
    """
    morphology_enabled = getattr(processor, "morphology_enabled", True)
    fashion_enabled = getattr(processor, "fashion_enabled", True)

    return JsonResponse({
        "status": "healthy",
        "service": "client-actor",
        "version": "1.0-modular",
        "timestamp": datetime.now().isoformat(),
        "modules": {
            "processor": True,
            "morphology": bool(morphology_enabled),
            "fashion": bool(fashion_enabled),
            "3d_reconstruction": True,
        },
    })

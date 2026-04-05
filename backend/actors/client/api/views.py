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

from tissue.skin_analyzer import AccurateSkinAnalyzer


logger = logging.getLogger(__name__)


PIPELINE_ROOT = Path(getattr(settings, "PIPELINE_ROOT", Path(__file__).resolve().parent.parent / "ml_pipeline"))
UPLOAD_FOLDER = Path(getattr(settings, "PIPELINE_UPLOADS", PIPELINE_ROOT / "uploads"))
RESULTS_FOLDER = Path(getattr(settings, "PIPELINE_RESULTS", PIPELINE_ROOT / "results"))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

_processor = None

def get_processor():
    global _processor
    if _processor is None:
        logger.info("Initializing BodyProcessor (lazy load)...")
        _processor = BodyProcessor()
    return _processor



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
        result: dict[str, Any] = get_processor().process(
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


@csrf_exempt
def analyze_skin_tone(request: HttpRequest):
    """
    Analyze skin tone from an uploaded photo.
    POST /api/client/skin-analysis/
    Returns skin tone analysis + real fabric recommendations from the database.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    photo = request.FILES.get("photo")
    if not photo:
        return JsonResponse({"error": "No photo provided"}, status=400)

    # Save temporary file for analysis
    temp_filename = f"skin_analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}_{photo.name}"
    temp_path = UPLOAD_FOLDER / temp_filename
    
    try:
        with open(temp_path, "wb+") as dest:
            for chunk in photo.chunks():
                dest.write(chunk)

        # Initialize analyzer with absolute path to database
        db_path = os.path.join(settings.BASE_DIR, "tissue", "skin_tone_colors_database.json")
        analyzer = AccurateSkinAnalyzer(json_path=db_path)
        
        # Analyze
        result = analyzer.analyze(str(temp_path))
        
        if not result:
            return JsonResponse({
                "error": "Face not detected. Please ensure your face is clearly visible and well-lit.",
                "status": "error"
            }, status=400)

        # --- Match real fabrics from the database ---
        try:
            import numpy as np
            from actors.fournisseur.models import Fabric

            # Get recommended colors from the skin analysis result
            recommended_colors = result.get("colors", [])
            
            # Fetch available fabrics (those with a valid RGB color and stock > 0)
            all_fabrics = Fabric.objects.filter(quantite__gt=0).values(
                "id", "color", "materiel", "description", "prix", "quantite"
            )

            fabric_scores = []
            for fabric in all_fabrics:
                fabric_rgb = fabric.get("color")
                # color field is stored as [R, G, B]
                if not fabric_rgb or not isinstance(fabric_rgb, list) or len(fabric_rgb) != 3:
                    continue

                f_rgb = np.array(fabric_rgb, dtype=float)
                
                # Find the minimum distance to any recommended color
                min_distance = float("inf")
                best_match_color = None
                
                for rec_color in recommended_colors:
                    if not isinstance(rec_color.get("rgb"), list):
                        continue
                    r_rgb = np.array(rec_color["rgb"], dtype=float)
                    dist = float(np.linalg.norm(f_rgb - r_rgb))
                    if dist < min_distance:
                        min_distance = dist
                        best_match_color = rec_color

                if best_match_color is None:
                    continue

                # Score: 0-100, lower distance = higher score
                similarity_score = max(0.0, round(100 - (min_distance / 4.41), 1))

                fabric_scores.append({
                    "id": fabric["id"],
                    "materiel": fabric["materiel"],
                    "description": fabric["description"] or fabric["materiel"],
                    "prix": float(fabric["prix"]),
                    "quantite": float(fabric["quantite"]),
                    "color": fabric["color"],
                    "similarity_score": similarity_score,
                    "matched_recommendation": best_match_color["name"] if best_match_color else None,
                    "image_url": f"/api/images/{fabric['id']}",
                })

            # Sort by similarity score and return top 6
            fabric_scores.sort(key=lambda x: x["similarity_score"], reverse=True)
            result["fabric_recommendations"] = fabric_scores[:6]
            result["total_fabrics_checked"] = len(fabric_scores)

        except Exception as fabric_err:
            logger.warning("Fabric matching failed (non-critical): %s", fabric_err)
            result["fabric_recommendations"] = []
            result["fabric_error"] = str(fabric_err)

        return JsonResponse(result)
            
    except Exception as e:
        logger.exception("Skin analysis error: %s", e)
        return JsonResponse({"error": str(e), "status": "error"}, status=500)
    finally:
        # Cleanup temp file
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except Exception:
                pass


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
    proc = get_processor()
    morphology_enabled = getattr(proc, "morphology_enabled", True)
    fashion_enabled = getattr(proc, "fashion_enabled", True)

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

# --- Client Projects ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework import status as drf_status

@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def handle_projects(request):
    from actors.client.models.models import ClientProject
    from django.utils import timezone

    if request.method == "POST":
        try:
            data = request.data
            project = ClientProject(
                client_id=request.user.id,
                scan_result=data.get("scan_result", {}),
                skin_result=data.get("skin_result", {}),
                selected_designs=data.get("selected_designs", []),
                selected_fabrics=data.get("selected_fabrics", []),
                status=data.get("status", "saved"),
                created_at=timezone.now(),
                updated_at=timezone.now()
            )
            project.save()
            return Response({
                "message": "Project saved successfully", 
                "id": str(project.id)
            }, status=drf_status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception("Failed to save project: %s", e)
            return Response({"error": str(e)}, status=drf_status.HTTP_400_BAD_REQUEST)

    elif request.method == "GET":
        try:
            from actors.couturehouse.models.models import Order
            
            projects = ClientProject.objects.filter(client_id=request.user.id).order_by("-created_at")
            results = []
            for p in projects:
                # Determine real tracking status by checking associated SQL orders
                main_order = Order.objects.filter(inquiry_id=str(p.id)).first()
                derived_status = p.status
                if main_order:
                    # If production says completed, it's ready for shipment/payment
                    derived_status = main_order.status
                    
                results.append({
                    "id": str(p.id),
                    "status": derived_status,
                    "original_status": p.status,
                    "created_at": p.created_at,
                    "summary": {
                        "designs_count": len(p.selected_designs),
                        "fabrics_count": len(p.selected_fabrics)
                    }
                })
            return Response({"projects": results})
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error in handle_projects GET: {e}\n{error_trace}")
            return Response({"error": str(e), "traceback": error_trace}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_project_details(request: HttpRequest, project_id: str):
    from actors.client.models.models import ClientProject
    from actors.couturehouse.models.models import Order
    from actors.fournisseur.models import FabricOrder
    from actors.delivery.models.models import ShipmentRequest
    
    from bson import ObjectId
    
    try:
        try:
            project = ClientProject.objects.get(id=ObjectId(project_id), client_id=request.user.id)
        except:
            project = ClientProject.objects.get(id=project_id, client_id=request.user.id)
        
        # Fetch related SQL orders
        orders = Order.objects.filter(inquiry_id=str(project.id))
        order_list = []
        
        for o in orders:
            tracking_info = {
                "order_id": o.id,
                "status": o.status,
                "fabric_status": o.fabric_status,
                "fabric_requested": o.fabric_requested,
                "delivery": None
            }
            
            # If there's a fabric order related to this inquiry
            # Note: FabricOrder doesn't have an inquiry_id, so we match by couture_house and fabric_id
            f_order = None
            if o.fabric_id:
                try:
                    f_order = FabricOrder.objects.filter(
                        couture_house_id=o.couture_house.id,
                        fabric_id=o.fabric_id
                    ).order_by('-created_at').first()
                except Exception as e:
                    pass
            
            if f_order:
                shipment = ShipmentRequest.objects.filter(fabric_order_id=f_order.id).first()
                tracking_info["delivery"] = {
                    "fabric_order_status": f_order.status,
                    "shipment_status": shipment.status if shipment else None
                }
            
            order_list.append(tracking_info)

        return JsonResponse({
            "id": str(project.id),
            "status": project.status,
            "scan_result": project.scan_result,
            "skin_result": project.skin_result,
            "selected_designs": project.selected_designs,
            "selected_fabrics": project.selected_fabrics,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "tracking": order_list
        })
    except ClientProject.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def submit_project(request: HttpRequest, project_id: str):
    """
    Submits a saved project to the respective Couture House(s).
    Converts a MongoDB ClientProject into SQL Order(s).
    """
    from actors.client.models.models import ClientProject
    from actors.couturehouse.models.models import Design, Order, CoutureHouseProfile
    from actors.fournisseur.models import Fabric
    from django.utils import timezone
    from bson import ObjectId

    try:
        logger.info(f"Submitting project {project_id} for user {request.user.id}")
        
        try:
            project = ClientProject.objects.get(id=ObjectId(project_id), client_id=request.user.id)
        except:
             project = ClientProject.objects.get(id=project_id, client_id=request.user.id)
        
        if not project.selected_designs:
            return JsonResponse({"error": "Aucun design sélectionné pour ce projet."}, status=400)

        # 1. Identify Couture Houses from selected designs
        design_ids = []
        for did in project.selected_designs:
            try:
                design_ids.append(ObjectId(did))
            except: pass
            
        designs = Design.objects.filter(id__in=design_ids)

        if not designs:
            logger.warning(f"No designs found in MongoDB for IDs: {project.selected_designs}")
            return JsonResponse({"error": "Designs introuvables dans la base de données."}, status=404)

        # 2. Get fabrics info
        fabric_names = []
        if project.selected_fabrics:
            try:
                # Convert MongoEngine BaseList to standard Python list for SQL filter
                fabric_ids = list(project.selected_fabrics)
                fabrics = Fabric.objects.filter(id__in=fabric_ids)
                fabric_names = [f.materiel for f in fabrics]
            except Exception as fe:
                logger.warning(f"Error fetching fabrics: {fe}")

        # 3. Create Orders
        created_orders = []
        # Unique houses to avoid duplicate orders for the same project
        house_user_ids = set()
        for d in designs:
            if hasattr(d, 'fashion_house_id') and d.fashion_house_id:
                house_user_ids.add(d.fashion_house_id)

        if not house_user_ids:
            return JsonResponse({"error": "Aucune maison de couture n'est associée à ces designs."}, status=400)

        current_client_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

        for house_user_id in house_user_ids:
            try:
                # Find the profile by the user ID stored in the Design
                house_profile = CoutureHouseProfile.objects.filter(user_id=house_user_id).first()
                if not house_profile:
                    logger.warning(f"CoutureHouseProfile not found for user_id {house_user_id}")
                    continue
                
                order = Order.objects.create(
                    inquiry_id=str(project.id),
                    couture_house=house_profile,
                    client_name=current_client_name,
                    client_email=request.user.email,
                    fabric_requested=", ".join(fabric_names) if fabric_names else "Sourcing Requis",
                    quantity_needed=5.0, # Default estimate
                    status='pending',
                    fabric_status='to_order' if fabric_names else 'available'
                )
                created_orders.append(order.id)
                logger.info(f"Created SQL Order {order.id} for project {project.id}")
            except Exception as oe:
                logger.exception(f"Failed to create order for house {house_user_id}: {oe}")
                continue

        if not created_orders:
             return JsonResponse({
                 "error": f"L'Atelier sélectionné (ID {list(house_user_ids)}) n'a pas de profil actif ou valide.",
                 "details": "Vérifiez que la maison de couture a complété son profil."
             }, status=400)

        # 4. Update Project Status
        project.status = "sent"
        project.updated_at = timezone.now()
        project.save()

        return JsonResponse({
            "message": "Projet envoyé avec succès à l'Atelier.",
            "orders": created_orders,
            "status": "sent"
        })

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.exception("Global submission failure: %s", e)
        return JsonResponse({
            "error": f"Erreur lors de l'envoi: {str(e)}", 
            "traceback": error_trace
        }, status=500)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def pay_project_order(request, project_id):
    """
    Simulates a payment and updates the SQL Order status.
    Requires the user to have a linked Bank Card.
    """
    from actors.couturehouse.models.models import Order
    from django.utils import timezone
    
    try:
        # Security Requirement: Must have a linked card
        # Wrap hasattr in try/except or catch DoesNotExist just in case
        try:
            has_card = hasattr(request.user, 'bank_card') and request.user.bank_card is not None
        except Exception:
            has_card = False

        if not has_card:
            return Response({
                "error": "Aucune carte bancaire liée.",
                "code": "CARD_REQUIRED",
                "message": "Vous devez lier une carte bancaire dans vos paramètres avant de pouvoir effectuer un paiement."
            }, status=drf_status.HTTP_402_PAYMENT_REQUIRED)

        # Find the order associated with this project/inquiry
        order = Order.objects.filter(inquiry_id=project_id).first()
        if not order:
            return Response({"error": "Aucune commande associée à ce projet."}, status=drf_status.HTTP_404_NOT_FOUND)
        
        # Payment Logic
        order.is_paid = True
        order.payment_date = timezone.now()
        order.save()
        
        return Response({
            "message": "Paiement réussi.",
            "is_paid": True,
            "payment_date": order.payment_date
        })
    except Exception as e:
        logger.error(f"Payment failure: {e}")
        return Response({"error": str(e)}, status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_ateliers(request):
    """
    Returns a list of all approved couture houses with optional search.
    """
    from actors.couturehouse.models.models import CoutureHouseProfile
    from actors.couturehouse.api.serializers import CoutureHousePublicSerializer
    from django.db.models import Q
    from django.shortcuts import get_object_or_404
    
    search_query = request.query_params.get('search', '')
    
    # Only show approved houses
    queryset = CoutureHouseProfile.objects.filter(verification_status='approved')
    
    if search_query:
        queryset = queryset.filter(
            Q(house_name__icontains=search_query) | 
            Q(specialization__icontains=search_query)
        )
        
    serializer = CoutureHousePublicSerializer(queryset, many=True)
    return Response({"ateliers": serializer.data})

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_atelier_details(request, atelier_id):
    """
    Returns the full public profile of a specific couture house.
    """
    from actors.couturehouse.models.models import CoutureHouseProfile
    from actors.couturehouse.api.serializers import CoutureHousePublicSerializer
    from django.shortcuts import get_object_or_404
    
    atelier = get_object_or_404(CoutureHouseProfile, id=atelier_id, verification_status='approved')
    serializer = CoutureHousePublicSerializer(atelier)
    
    return Response(serializer.data)


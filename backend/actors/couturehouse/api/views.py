from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_mongoengine import generics
from django.http import FileResponse
import os

from ..models import Design, DesignMedia, DesignLike, Order, LocalFabricStock, CoutureHouseProfile
from .serializers import (
    DesignSerializer, DesignWriteSerializer, DesignMediaSerializer,
    OrderSerializer, LocalFabricStockSerializer
)

class IsFashionHouseOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return str(obj.fashion_house_id) == str(request.user.id)

# --- Designs ---

class DesignListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DesignSerializer

    def get_serializer_class(self):
        if self.request.method == "POST":
            return DesignWriteSerializer
        return DesignSerializer

    def get_queryset(self):
        return Design.objects.filter(fashion_house_id=self.request.user.id)

    def perform_create(self, serializer):
        serializer.save(fashion_house_id=self.request.user.id)

class DesignDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsFashionHouseOwner]
    serializer_class = DesignSerializer
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return DesignWriteSerializer
        return DesignSerializer

    def get_queryset(self):
        return Design.objects.filter(fashion_house_id=self.request.user.id)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def publish_design(request, id):
    try:
        design = Design.objects.get(id=id, fashion_house_id=request.user.id)
    except Design.DoesNotExist:
        return Response({"detail": "Design introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if design.status == "published":
        return Response({"detail": "Ce design est déjà publié."}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils import timezone
    design.status = "published"
    design.published_at = timezone.now()
    design.save()
    return Response(DesignSerializer(design).data)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def archive_design(request, id):
    try:
        design = Design.objects.get(id=id, fashion_house_id=request.user.id)
    except Design.DoesNotExist:
        return Response({"detail": "Design introuvable."}, status=status.HTTP_404_NOT_FOUND)

    design.status = "archived"
    design.save()
    return Response(DesignSerializer(design).data)

# --- Médias ---

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def upload_design_media(request, id):
    """
    Spécificité MongoDB : On ajoute le média à la liste Embeded du design.
    """
    from bson import ObjectId
    print(f"DEBUG: upload_design_media received ID='{id}' type={type(id)}")
    
    try:
        # Try finding by string ID first (MongoEngine handles string to ObjectId conversion automatically for .get(id=...))
        try:
            design = Design.objects.get(id=id, fashion_house_id=request.user.id)
        except (Design.DoesNotExist, ValueError):
            # Fallback for weird ID formats
            try:
                obj_id = ObjectId(id)
                design = Design.objects.get(id=obj_id, fashion_house_id=request.user.id)
            except:
                print(f"DEBUG: Failed to find design with ID='{id}' (attempts with string and ObjectId failed)")
                return Response({"detail": f"ID de design invalide ou introuvable: {id}"}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "Aucun fichier fourni."}, status=status.HTTP_400_BAD_REQUEST)

        # Sauvegarde physique
        from django.core.files.storage import default_storage
        import os
        
        # Ensure filename is safe
        filename = file_obj.name.replace(" ", "_")
        storage_path = os.path.join("couturehouse", "designs", filename)
        
        # If file exists, rename or overwrite (default_storage.save handles conflicts by suffixing)
        saved_path = default_storage.save(storage_path, file_obj)

        new_media = DesignMedia(
            file=saved_path,
            media_type=request.data.get('media_type', 'photo'),
            view_angle=request.data.get('view_angle', 'front'),
            is_cover=request.data.get('is_cover', 'false').lower() == 'true',
            order=int(request.data.get('order', 0))
        )

        design.media.append(new_media)
        design.save()
        
        return Response(DesignSerializer(design).data, status=status.HTTP_201_CREATED)
        
    except Design.DoesNotExist:
        return Response({"detail": "Design introuvable."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import traceback
        print(f"ERROR in upload_design_media: {str(e)}")
        print(traceback.format_exc())
        return Response({"detail": f"Erreur serveur : {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from rest_framework.views import APIView

class DesignMediaView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, id, filename):
        try:
            design = Design.objects.get(id=id)
            
            # Find media in embedded list
            target_media = None
            for m in design.media:
                # media.file is a StringField in MongoDB storing relative path
                if os.path.basename(m.file) == filename:
                    target_media = m
                    break
            
            if not target_media:
                return Response({"detail": "Média introuvable."}, status=status.HTTP_404_NOT_FOUND)
                
            # Construct absolute path using MEDIA_ROOT
            full_path = os.path.join(settings.MEDIA_ROOT, target_media.file)
            if not os.path.exists(full_path):
                return Response({"detail": "Fichier physique introuvable."}, status=status.HTTP_404_NOT_FOUND)
                
            return FileResponse(open(full_path, 'rb'))
            
        except Design.DoesNotExist:
            return Response({"detail": "Design introuvable."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Public & Interactive ---

class PublicDesignListView(generics.ListAPIView):
    """
    Publicly accessible list of published designs.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = DesignSerializer

    def get_queryset(self):
        return Design.objects.filter(status="published")

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def toggle_design_like(request, id):
    try:
        # Check if design exists and is published (can only like published ones)
        design = Design.objects.get(id=id, status="published")
        
        like_obj = DesignLike.objects.filter(user=request.user, design_id=str(id)).first()
        
        if like_obj:
            like_obj.delete()
            liked = False
        else:
            DesignLike.objects.create(user=request.user, design_id=str(id))
            liked = True
            
        return Response({
            "liked": liked,
            "likes_count": DesignLike.objects.filter(design_id=str(id)).count()
        })
    except Design.DoesNotExist:
        return Response({"detail": "Design introuvable ou non publié."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Inquiries (Client Projects) ---
from actors.client.models.models import ClientProject
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def handle_inquiries(request):
    """
    Get a list of ClientProjects that reference designs owned by this Couture House.
    """
    # 1. Get IDs of all designs owned by this house
    my_design_ids = [str(d.id) for d in Design.objects.filter(fashion_house_id=request.user.id)]
    
    if not my_design_ids:
        return Response({"inquiries": []})

    # 2. Find projects that have at least one of these designs selected
    # MongoEngine query: selected_designs__in=[...]
    projects = ClientProject.objects.filter(selected_designs__in=my_design_ids).order_by("-created_at")
    
    results = []
    for p in projects:
        # Get client user info
        try:
            client_user = User.objects.get(id=p.client_id)
            client_name = f"{client_user.first_name} {client_user.last_name}" if client_user.first_name else client_user.username
        except User.DoesNotExist:
            client_name = "Unknown Client"

        results.append({
            "id": str(p.id),
            "client_name": client_name,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "summary": {
                "designs_count": len([d for d in p.selected_designs if d in my_design_ids]),
                "total_designs": len(p.selected_designs)
            }
        })
        
    return Response({"inquiries": results})

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_inquiry_details(request, id):
    """
    Get full details of a specific client project, ensuring it belongs to this house's designs.
    """
    from actors.fournisseur.models import Fabric
    
    try:
        project = ClientProject.objects.get(id=id)
        
        # Security check: Does this project contain any of this house's designs?
        my_design_ids = [str(d.id) for d in Design.objects.filter(fashion_house_id=request.user.id)]
        has_access = any(d_id in my_design_ids for d_id in project.selected_designs)
        
        if not has_access:
            return Response({"detail": "Non autorisé à voir ce projet."}, status=status.HTTP_403_FORBIDDEN)

        # Get client user info
        try:
            client_user = User.objects.get(id=project.client_id)
            client_name = f"{client_user.first_name} {client_user.last_name}" if client_user.first_name else client_user.username
        except User.DoesNotExist:
            client_name = "Unknown Client"

        # Hydrate designs
        hydrated_designs = []
        for d_id in project.selected_designs:
            try:
                d_obj = Design.objects.get(id=d_id)
                # Find cover or first photo
                cover = next((m for m in d_obj.media if m.is_cover), d_obj.media[0] if d_obj.media else None)
                image_url = f"{settings.MEDIA_URL}{cover.file}" if cover else None
                hydrated_designs.append({
                    "id": d_id, 
                    "title": d_obj.title, 
                    "is_mine": d_id in my_design_ids,
                    "image_url": image_url
                })
            except Design.DoesNotExist:
                hydrated_designs.append({
                    "id": d_id, 
                    "title": f"Design #{d_id[:6]}", 
                    "is_mine": d_id in my_design_ids,
                    "image_url": None
                })

        # Hydrate fabrics
        hydrated_fabrics = []
        for f_id in project.selected_fabrics:
            try:
                f_obj = Fabric.objects.get(id=f_id)
                hydrated_fabrics.append({
                    "id": f_id, 
                    "name": f_obj.materiel,
                    "color": f_obj.color if isinstance(f_obj.color, list) and len(f_obj.color) == 3 else None
                })
            except Fabric.DoesNotExist:
                hydrated_fabrics.append({
                    "id": f_id, 
                    "name": f"Matière #{f_id}",
                    "color": None
                })
            
        return Response({
            "id": str(project.id),
            "client_id": project.client_id,
            "client_name": client_name,
            "status": project.status,
            "scan_result": project.scan_result,
            "skin_result": project.skin_result,
            "selected_designs": hydrated_designs,
            "selected_fabrics": hydrated_fabrics,
            "created_at": project.created_at.isoformat() if project.created_at else None,
        })
    except ClientProject.DoesNotExist:
        return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

# --- Orders (Production) ---

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def handle_orders(request):
    """
    Get all production orders for this house.
    """
    house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)
    orders = Order.objects.filter(couture_house=house_profile).order_by("-created_at")
    serializer = OrderSerializer(orders, many=True)
    return Response({"orders": serializer.data})

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_order_from_inquiry(request, id):
    """
    Convert a ClientProject (Inquiry) into a Production Order.
    """
    try:
        project = ClientProject.objects.get(id=id)
        house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)

        # Prevent duplicate orders
        existing_order = Order.objects.filter(inquiry_id=id, couture_house=house_profile).first()
        if existing_order:
            if project.status not in ['ordered', 'in_production', 'completed', 'shipped']:
                project.status = 'ordered'
                project.save()
            return Response(OrderSerializer(existing_order).data, status=status.HTTP_200_OK)

        # Get client info
        try:
            client_user = User.objects.get(id=project.client_id)
            client_name = f"{client_user.first_name} {client_user.last_name}" or client_user.username
            client_email = client_user.email
        except User.DoesNotExist:
            client_name = "Unknown Client"
            client_email = ""

        # Use the first fabric selected as primary for now
        fabric_id = project.selected_fabrics[0] if project.selected_fabrics else None
        fabric_name = "To be defined"
        if fabric_id:
            from actors.fournisseur.models import Fabric
            try:
                f = Fabric.objects.get(id=fabric_id)
                fabric_name = f.materiel
            except: pass

        # Create Order
        order = Order.objects.create(
            inquiry_id=id,
            couture_house=house_profile,
            client_name=client_name,
            client_email=client_email,
            fabric_requested=fabric_name,
            fabric_id=fabric_id,
            quantity_needed=2.5, # Default estimation
            status='pending'
        )
        
        # Update project status
        project.status = 'ordered'
        project.save()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_order_details(request, id):
    """
    Get full order info plus stock analysis.
    """
    order = get_object_or_404(Order, id=id)
    
    # Check local stock
    stock = LocalFabricStock.objects.filter(
        couture_house=order.couture_house, 
        fabric_name__iexact=order.fabric_requested
    ).first()
    
    local_qty = stock.quantity if stock else 0
    is_available = local_qty >= order.quantity_needed
    
    # Check supplier stock if local is low
    supplier_stock = 0
    fabric_price = 0
    fabric_nature = ""
    fabric_image_url = ""
    if order.fabric_id:
        from actors.fournisseur.models import Fabric
        try:
            f = Fabric.objects.get(id=order.fabric_id)
            supplier_stock = f.quantite
            fabric_price = float(f.prix) if f.prix is not None else 0.0
            fabric_nature = f.materiel
            if f.image:
                fabric_image_url = f.image.url
        except: pass

    data = OrderSerializer(order).data
    data['stock_analysis'] = {
        'is_available_locally': is_available,
        'local_quantity': float(local_qty),
        'needed_quantity': float(order.quantity_needed),
        'supplier_available_quantity': float(supplier_stock),
        'fabric_price': fabric_price,
        'fabric_nature': fabric_nature,
        'fabric_image_url': fabric_image_url
    }
    
    # Fetch 3D info from inquiry if linked
    if order.inquiry_id:
        try:
            project = ClientProject.objects.get(id=order.inquiry_id)
            data['scan_result'] = project.scan_result
            data['skin_result'] = project.skin_result
            
            # If fabric_id is missing in SQL, try to recover it from the fabric material matches
            if not data.get('fabric_id') and data.get('fabric_requested'):
                from actors.fournisseur.models import Fabric
                matched_fabric = Fabric.objects.filter(materiel__iexact=data['fabric_requested']).first()
                if matched_fabric:
                    # Update SQL record silently for next time
                    order = Order.objects.get(id=id)
                    order.fabric_id = matched_fabric.id
                    order.save()
                    data['fabric_id'] = matched_fabric.id
                    print(f"DEBUG: Recovered fabric_id {matched_fabric.id} for order {id} via material match")
            
            # If fabric_id is missing in SQL, try to recover it from the fabric material matches
            if not data.get('fabric_id') and data.get('fabric_requested'):
                from actors.fournisseur.models import Fabric
                matched_fabric = Fabric.objects.filter(materiel__iexact=data['fabric_requested']).first()
                if matched_fabric:
                    # Update SQL record silently for next time
                    from actors.client.models import Order as ClientOrder
                    order_obj = ClientOrder.objects.get(id=id)
                    order_obj.fabric_id = matched_fabric.id
                    order_obj.save()
                    data['fabric_id'] = matched_fabric.id
                    print(f"DEBUG: Recovered fabric_id {matched_fabric.id} for order {id} via material match")
            
            # Fetch the Suit Design Photo
            if project.selected_designs:
                from actors.couturehouse.models.models import Design
                design_id = project.selected_designs[0]
                try:
                    design = Design.objects.get(id=design_id)
                    # Find cover image or first media
                    cover = next((m for m in design.media if m.is_cover), None)
                    if not cover and design.media:
                        cover = design.media[0]
                    
                    if cover:
                        # Convert partial media path to full URL
                        media_path = cover.file
                        if not media_path.startswith('/media/'):
                            media_path = f"/media/{media_path}"
                        data['design_preview_url'] = media_path
                except:
                    pass
        except: pass

    return Response(data)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_fabric_orders(request):
    """
    Returns all raw material orders (purchases from suppliers) for this house.
    """
    from actors.fournisseur.models import FabricOrder
    from actors.fournisseur.serializers import FabricOrderSerializer
    
    house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)
    orders = FabricOrder.objects.filter(couture_house_id=house_profile.id).order_by('-created_at')
    
    serializer = FabricOrderSerializer(orders, many=True)
    return Response({"orders": serializer.data})
    
@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def update_order_quantity(request, id):
    """
    Allow Couture House to manually set the required quantity for an order.
    """
    order = get_object_or_404(Order, id=id)
    # Check ownership
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    if order.couture_house != house:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    qty = request.data.get('quantity_needed')
    if qty is not None:
        try:
            order.quantity_needed = float(qty)
            order.save()
            return Response({"success": True, "quantity_needed": order.quantity_needed})
        except (ValueError, TypeError):
            return Response({"error": "Invalid quantity value"}, status=status.HTTP_400_BAD_REQUEST)
            
    return Response({"error": "Missing quantity_needed"}, status=status.HTTP_400_BAD_REQUEST)

# --- Local Stock ---

@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def handle_local_stock(request):
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    if request.method == "GET":
        stocks = LocalFabricStock.objects.filter(couture_house=house)
        return Response(LocalFabricStockSerializer(stocks, many=True).data)
    
    # Add or Update stock
    fabric_name = request.data.get('fabric_name')
    qty = request.data.get('quantity', 0)
    
    stock, created = LocalFabricStock.objects.get_or_create(
        couture_house=house, fabric_name=fabric_name
    )
    stock.quantity = qty
    stock.save()
    return Response(LocalFabricStockSerializer(stock).data)

@api_view(["PATCH", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def handle_local_stock_item(request, item_id):
    """
    PATCH /atelier/stock/{id}/ — Update the quantity of a local stock item.
    DELETE /atelier/stock/{id}/ — Remove a local stock item.
    """
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    stock = get_object_or_404(LocalFabricStock, id=item_id, couture_house=house)
    
    if request.method == "DELETE":
        stock.delete()
        return Response({"success": True, "message": "Matière supprimée du stock."})
    
    # PATCH — update quantity and/or fabric_name
    if 'quantity' in request.data:
        try:
            stock.quantity = float(request.data['quantity'])
        except (ValueError, TypeError):
            return Response({"error": "Invalid quantity"}, status=status.HTTP_400_BAD_REQUEST)
    if 'fabric_name' in request.data:
        stock.fabric_name = request.data['fabric_name']
    stock.save()
    return Response(LocalFabricStockSerializer(stock).data)

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def start_production(request, id):
    """
    Marks a production order as 'in_production'.
    """
    order = get_object_or_404(Order, id=id)
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    
    if order.couture_house != house:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    order.status = 'in_production'
    order.save()
    
    return Response({
        "status": "in_production",
        "message": "Production lancée."
    })

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def complete_order(request, id):
    """
    Marks a production order as completed and notifies the client by updating project status.
    """
    order = get_object_or_404(Order, id=id)
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    
    if order.couture_house != house:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    order.status = 'completed'
    order.save()
    
    # Sync with ClientProject if linked
    if order.inquiry_id:
        from actors.client.models.models import ClientProject
        try:
            from bson import ObjectId
            project = ClientProject.objects.get(id=ObjectId(order.inquiry_id))
            project.status = 'completed' # Set to completed to "notify" client
            project.save()
        except Exception as e:
            print(f"Error updating client project: {e}")
            
    return Response({
        "status": "completed",
        "message": "Production terminée. Le client a été notifié."
    })

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def ship_order(request, id):
    """
    Marks a production order as 'shipped' after payment.
    """
    order = get_object_or_404(Order, id=id)
    house = get_object_or_404(CoutureHouseProfile, user=request.user)
    
    if order.couture_house != house:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
    if not order.is_paid:
        return Response({"error": "Le paiement est requis avant l'expédition."}, status=status.HTTP_400_BAD_REQUEST)
        
    order.status = 'shipped'
    order.save()
    
    # Sync with ClientProject if linked
    if order.inquiry_id:
        from actors.client.models.models import ClientProject
        try:
            from bson import ObjectId
            project = ClientProject.objects.get(id=ObjectId(order.inquiry_id))
            project.status = 'shipped'
            project.save()
        except Exception as e:
            print(f"Error updating client project: {e}")
            
    return Response({
        "status": "shipped",
        "message": "Costume expédié avec succès."
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def confirm_fabric_receipt(request, order_id):
    """
    Finalizes a Fabric Order from the Couture House side.
    Sets both FabricOrder and ShipmentRequest to 'delivered' and updates local stock.
    """
    from actors.fournisseur.models import FabricOrder
    from actors.delivery.models import ShipmentRequest
    
    order = get_object_or_404(FabricOrder, id=order_id)
    house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)
    
    # Verify ownership
    if order.couture_house_id != house_profile.id:
        return Response({"error": "Non autorisé à confirmer cette livraison."}, status=status.HTTP_403_FORBIDDEN)
        
    # 1. Update statuses
    order.status = 'received'
    order.save()
    
    # Sync with shipment request
    ShipmentRequest.objects.filter(fabric_order_id=order.id).update(status='delivered')
    
    # 2. Update local stock
    stock, created = LocalFabricStock.objects.get_or_create(
        couture_house=house_profile, 
        fabric_name=order.fabric.materiel
    )
    stock.quantity = float(stock.quantity) + float(order.quantity)
    stock.save()

    # 3. Update related client orders waiting for this fabric
    Order.objects.filter(
        couture_house=house_profile,
        fabric_id=order.fabric.id,
        fabric_status='ordered'
    ).update(fabric_status='received')
    
    return Response({
        "status": "delivered",
        "new_stock": float(stock.quantity),
        "message": f"Livraison confirmée. {order.quantity}m de {order.fabric.materiel} ajoutés à votre stock."
    })

@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def manage_profile(request):
    """
    GET: Fetch the current atelier's profile.
    POST: Update the atelier's profile fields, including video file upload.
    """
    from .serializers import CoutureHousePublicSerializer
    house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)
    
    if request.method == "POST":
        # Handle text fields manually so we can also handle the file
        text_fields = ['house_name', 'specialization', 'starting_price', 'avg_production_time', 'about_text']
        for field in text_fields:
            if field in request.data:
                setattr(house_profile, field, request.data[field])
        
        # Handle video file upload
        if 'introduction_video' in request.FILES:
            # Delete old video if exists
            if house_profile.introduction_video:
                try:
                    house_profile.introduction_video.delete(save=False)
                except Exception:
                    pass
            house_profile.introduction_video = request.FILES['introduction_video']
        
        house_profile.save()
        serializer = CoutureHousePublicSerializer(house_profile, context={'request': request})
        return Response(serializer.data)
        
    serializer = CoutureHousePublicSerializer(house_profile, context={'request': request})
    return Response(serializer.data)

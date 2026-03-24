from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_mongoengine import generics

from ..models import Design, DesignMedia
from .serializers import DesignSerializer, DesignWriteSerializer, DesignMediaSerializer

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

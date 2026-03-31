from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_mongoengine import generics
from django.http import FileResponse
import os

from ..models import Design, DesignMedia, DesignLike
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

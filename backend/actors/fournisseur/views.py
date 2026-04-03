from django.http import FileResponse
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from core.models.user import User
from django.shortcuts import get_object_or_404
import base64

from .models import SupplierProfile, Fabric, FabricLike
from .serializers import SupplierProfileSerializer, CompleteSupplierSerializer, FabricSerializer
from .utils import extract_main_color

class SignupView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_409_CONFLICT)

        # Create user
        user = User.objects.create_user(username=email, email=email, password=password)
        
        # Create profile
        profile_data = {
            'nom': data.get('nom', ''),
            'prenom': data.get('prenom', ''),
            'nomOrganization': data.get('nomOrganization', ''),
            'lieu': data.get('lieu', ''),
            'typeProduct': data.get('typeProduct', ''),
            'specialites': data.get('specialites', ''),
            'numeroLicence': data.get('numeroLicence', ''),
            'siteWeb': data.get('siteWeb', ''),
            'nombreEmployes': data.get('nombreEmployes', ''),
            'anneeCreation': data.get('anneeCreation', ''),
            'description': data.get('description', ''),
            'adresse': data.get('adresse', ''),
            'codePostal': data.get('codePostal', ''),
            'ville': data.get('ville', ''),
            'pays': data.get('pays', ''),
            'nomContact': data.get('nomContact', ''),
            'prenomContact': data.get('prenomContact', ''),
            'telephoneContact': data.get('telephoneContact', ''),
            'certificationsQualite': data.get('certificationsQualite', [])
        }
        SupplierProfile.objects.create(user=user, **profile_data)

        refresh = RefreshToken.for_user(user)

        # Match Flask response structure
        return Response({
            'success': True,
            'message': 'Account created',
            'user': {
                'id': user.id,
                'email': user.email,
                'nom': profile_data['nom'],
                'prenom': profile_data['prenom'],
                'nomOrganization': profile_data['nomOrganization']
            },
            'token': str(refresh.access_token)
        }, status=status.HTTP_201_CREATED)

class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        profile = getattr(user, 'supplier_profile', None)

        return Response({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'nom': profile.nom if profile else '',
                'prenom': profile.prenom if profile else '',
                'nomOrganization': profile.nomOrganization if profile else ''
            },
            'token': str(refresh.access_token)
        })

class VerifyTokenView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({
            'valid': True,
            'user_id': request.user.id,
            'email': request.user.email
        })

class ProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id=None):
        target_user = request.user
        if user_id and str(user_id) != str(request.user.id):
            target_user = get_object_or_404(User, id=user_id)
            
        profile = getattr(target_user, 'supplier_profile', None)
        if not profile:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Match python dict format expected
        user_data = {
            'id': target_user.id,
            '_id': target_user.id,
            'email': target_user.email,
            'nom': profile.nom,
            'prenom': profile.prenom,
            'nomOrganization': profile.nomOrganization,
            'lieu': profile.lieu,
            'typeProduct': profile.typeProduct,
            'specialites': profile.specialites,
            'numeroLicence': profile.numeroLicence,
            'siteWeb': profile.siteWeb,
            'nombreEmployes': profile.nombreEmployes,
            'anneeCreation': profile.anneeCreation,
            'description': profile.description,
            'adresse': profile.adresse,
            'codePostal': profile.codePostal,
            'ville': profile.ville,
            'pays': profile.pays,
            'nomContact': profile.nomContact,
            'prenomContact': profile.prenomContact,
            'telephoneContact': profile.telephoneContact,
            'certificationsQualite': profile.certificationsQualite,
        }
            
        return Response({'success': True, 'user': user_data})

    def put(self, request, user_id):
        if str(user_id) != str(request.user.id):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile = getattr(request.user, 'supplier_profile', None)
        if not profile:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        allowed_fields = [
            'nom', 'prenom', 'nomOrganization', 'lieu', 'typeProduct', 'specialites',
            'numeroLicence', 'siteWeb', 'nombreEmployes', 'anneeCreation',
            'description', 'adresse', 'codePostal', 'ville', 'pays',
            'nomContact', 'prenomContact', 'telephoneContact'
        ]

        for field in allowed_fields:
            if field in data:
                setattr(profile, field, data[field])
        
        profile.save()
        if 'email' in data:
            request.user.email = data['email']
            request.user.username = data['email']
            request.user.save()

        # Build response dict
        user_data = {
            'id': request.user.id,
            '_id': request.user.id,
            'email': request.user.email,
        }
        for field in allowed_fields:
            user_data[field] = getattr(profile, field)

        return Response({'success': True, 'message': 'Profile updated', 'user': user_data})

class LogoutView(views.APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        return Response({'success': True, 'message': 'Logged out'})

class FabricListView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        fabrics = Fabric.objects.filter(user=request.user)
        fabrics_data = []
        for f in fabrics:
            fabrics_data.append({
                '_id': f.id,
                'id': f.id,
                'color': f.color,
                'quantite': float(f.quantite),
                'materiel': f.materiel,
                'prix': float(f.prix),
                'description': f.description,
                'likes': f.likes
            })
        return Response({'fabrics': fabrics_data})

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # File size check (5MB)
        if image_file.size > 5 * 1024 * 1024:
            return Response({'error': 'File size exceeds 5MB limit'}, status=status.HTTP_400_BAD_REQUEST)

        color = extract_main_color(image_file)

        fabric = Fabric(
            user=request.user,
            image=image_file,
            color=color,
            quantite=request.data.get('quantite', 0),
            materiel=request.data.get('materiel', ''),
            prix=request.data.get('prix', 0),
            description=request.data.get('description', '')
        )
        fabric.save()

        response_fabric = {
            '_id': fabric.id,
            'id': fabric.id,
            'quantite': float(fabric.quantite),
            'materiel': fabric.materiel,
            'prix': float(fabric.prix),
            'description': fabric.description,
        }

        return Response({
            'message': 'Fabric created successfully',
            'fabric': response_fabric,
            'color': color
        }, status=status.HTTP_201_CREATED)

class PublicFabricListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        liked_ids = []
        if user.is_authenticated:
            liked_ids = FabricLike.objects.filter(user=user).values_list('fabric_id', flat=True)

        fabrics_data = []
        fabrics = Fabric.objects.all()
        for f in fabrics:
            fabrics_data.append({
                'id': f.id,
                'color': f.color,
                'quantite': float(f.quantite),
                'materiel': f.materiel,
                'prix': float(f.prix),
                'description': f.description,
                'likes': f.likes,
                'is_liked': f.id in liked_ids,
                'created_at': f.created_at
            })
        return Response({'fabrics': fabrics_data})

class NewsFabricsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        fabrics = Fabric.objects.all().order_by('-created_at')[:10]
        user = request.user
        liked_ids = []
        if user.is_authenticated:
            liked_ids = FabricLike.objects.filter(user=user).values_list('fabric_id', flat=True)

        fabrics_data = []
        for f in fabrics:
            fabrics_data.append({
                'id': f.id,
                'color': f.color,
                'quantite': float(f.quantite),
                'materiel': f.materiel,
                'prix': float(f.prix),
                'description': f.description,
                'likes': f.likes,
                'is_liked': f.id in liked_ids
            })
        return Response({'fabrics': fabrics_data})

class TrendingFabricsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        fabrics = Fabric.objects.all().order_by('-likes')[:10]
        fabrics_data = []
        for f in fabrics:
            fabrics_data.append({
                'id': f.id,
                'color': f.color,
                'quantite': float(f.quantite),
                'materiel': f.materiel,
                'prix': float(f.prix),
                'description': f.description,
                'likes': f.likes
            })
        return Response({'fabrics': fabrics_data})

class LikeFabricView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        fabric = get_object_or_404(Fabric, pk=pk)
        like = FabricLike.objects.filter(user=request.user, fabric=fabric).first()
        
        if like:
            like.delete()
            fabric.likes = max(0, fabric.likes - 1)
            is_liked = False
        else:
            FabricLike.objects.create(user=request.user, fabric=fabric)
            fabric.likes += 1
            is_liked = True
            
        fabric.save()
        return Response({
            'success': True, 
            'likes': fabric.likes,
            'is_liked': is_liked
        })

class FabricDetailView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, pk):
        fabric = get_object_or_404(Fabric, pk=pk, user=request.user)
        fabric_data = {
            '_id': fabric.id,
            'id': fabric.id,
            'color': fabric.color,
            'quantite': float(fabric.quantite),
            'materiel': fabric.materiel,
            'prix': float(fabric.prix),
            'description': fabric.description,
        }
        return Response({'fabric': fabric_data})

    def put(self, request, pk):
        fabric = get_object_or_404(Fabric, pk=pk, user=request.user)
        
        image_file = request.FILES.get('image')
        if image_file:
            if image_file.size > 5 * 1024 * 1024:
                return Response({'error': 'File size exceeds 5MB limit'}, status=status.HTTP_400_BAD_REQUEST)
            fabric.image = image_file
            fabric.color = extract_main_color(image_file)
            
        if 'quantite' in request.data:
            fabric.quantite = request.data['quantite']
        if 'materiel' in request.data:
            fabric.materiel = request.data['materiel']
        if 'prix' in request.data:
            fabric.prix = request.data['prix']
        if 'description' in request.data:
            fabric.description = request.data['description']
            
        fabric.save()
        
        fabric_data = {
            '_id': fabric.id,
            'id': fabric.id,
            'color': fabric.color,
            'quantite': float(fabric.quantite),
            'materiel': fabric.materiel,
            'prix': float(fabric.prix),
            'description': fabric.description,
        }
        return Response({'message': 'Fabric updated', 'fabric': fabric_data})

    def delete(self, request, pk):
        fabric = get_object_or_404(Fabric, pk=pk, user=request.user)
        fabric.delete()
        return Response({'message': 'Fabric deleted'})

class FabricImageView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        fabric = get_object_or_404(Fabric, pk=pk)
        if not fabric.image:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            return FileResponse(open(fabric.image.path, 'rb'))
        except Exception as e:
            return Response({'error': f'Failed to retrieve image: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegistrationSerializer, MyTokenObtainPairSerializer, UserProfileSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from actors.fournisseur.models import Fabric, FabricLike
from actors.couturehouse.models.models import Design, DesignLike
from actors.couturehouse.api.serializers import DesignSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class VerifyTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({
            'valid': True,
            'user_id': request.user.id,
            'email': request.user.email,
            'role': getattr(request.user, 'role', '')
        })

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                return Response({
                    "message": "User registered successfully",
                    "user_id": user.id,
                    "role": user.role,
                    "status": user.account_status
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Registration Error: {str(e)}")
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, user_id=None):
        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            user = request.user
            
        serializer = UserProfileSerializer(user)
        
        # Fetch liked fabrics
        liked_fabrics_ids = FabricLike.objects.filter(user=user).values_list('fabric_id', flat=True)
        liked_fabrics = Fabric.objects.filter(id__in=liked_fabrics_ids)
        
        # Serialize fabrics manually for now or use a basic serializer
        fabrics_data = []
        for f in liked_fabrics:
            fabrics_data.append({
                'id': f.id,
                'materiel': f.materiel,
                'prix': float(f.prix),
                'quantite': float(f.quantite),
                'color': f.color,
                'description': f.description,
                'is_liked': True # By definition in this list
            })

        # Fetch liked designs
        liked_design_ids = DesignLike.objects.filter(user=user).values_list('design_id', flat=True)
        # Fetch actual MongoDB documents
        from bson import ObjectId
        mongo_ids = [ObjectId(did) for did in liked_design_ids if len(did) == 24]
        liked_designs = Design.objects.filter(id__in=mongo_ids)
        
        # Serialize designs - pass context for 'is_liked_by_user'
        designs_serializer = DesignSerializer(liked_designs, many=True, context={'request': request})
        
        return Response({
            "user": serializer.data,
            "liked_fabrics": fabrics_data,
            "liked_designs": designs_serializer.data
        })

    def put(self, request):
        user = request.user
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

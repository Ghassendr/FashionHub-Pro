from rest_framework import serializers as drf_serializers
from rest_framework_mongoengine import serializers
from ..models import Design, DesignMedia, DesignLike, CoutureHouseProfile, Order, LocalFabricStock

class DesignMediaSerializer(serializers.EmbeddedDocumentSerializer):
    class Meta:
        model = DesignMedia
        fields = ["file", "media_type", "view_angle", "is_cover", "order"]

class DesignSerializer(serializers.DocumentSerializer):
    media = DesignMediaSerializer(many=True, read_only=True)
    
    likes_count = drf_serializers.SerializerMethodField()
    is_liked_by_user = drf_serializers.SerializerMethodField()
    fashion_house_name = drf_serializers.SerializerMethodField()
    
    class Meta:
        model = Design
        fields = [
            "id", "fashion_house_id", "fashion_house_name", "title", "description", 
            "category", "fabric_suggestions", "status", "morphologies",
            "published_at", "created_at", "media",
            "likes_count", "is_liked_by_user"
        ]
        read_only_fields = ["status", "published_at", "created_at"]

    def get_likes_count(self, obj):
        return DesignLike.objects.filter(design_id=str(obj.id)).count()

    def get_is_liked_by_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return DesignLike.objects.filter(user=request.user, design_id=str(obj.id)).exists()
        return False

    def get_fashion_house_name(self, obj):
        try:
            profile = CoutureHouseProfile.objects.filter(user_id=obj.fashion_house_id).first()
            return profile.house_name if profile else "Atelier"
        except:
            return "Atelier"

class DesignWriteSerializer(serializers.DocumentSerializer):
    class Meta:
        model = Design
        fields = ["id", "title", "description", "category", "fabric_suggestions", "morphologies"]
        read_only_fields = ["id"]

class OrderSerializer(drf_serializers.ModelSerializer):
    client_has_card = drf_serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_client_has_card(self, obj):
        from core.models import User
        try:
            # Look up the user by email to check their card status
            user = User.objects.filter(email=obj.client_email).first()
            if user:
                return hasattr(user, 'bank_card') and user.bank_card is not None
        except Exception:
            pass
        return False

class LocalFabricStockSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = LocalFabricStock
        fields = '__all__'

class CoutureHousePublicSerializer(drf_serializers.ModelSerializer):
    username = drf_serializers.CharField(source='user.username', read_only=True)
    introduction_video_url = drf_serializers.SerializerMethodField()
    
    class Meta:
        model = CoutureHouseProfile
        fields = [
            'id', 'username', 'house_name', 'specialization', 
            'starting_price', 'avg_production_time', 'about_text', 
            'introduction_video_url', 'rating', 'review_count'
        ]

    def get_introduction_video_url(self, obj):
        request = self.context.get('request')
        if obj.introduction_video and obj.introduction_video.name:
            url = obj.introduction_video.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

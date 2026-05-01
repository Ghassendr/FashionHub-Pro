from rest_framework import serializers
from .models import SupplierProfile, Fabric, FabricOrder, Jewelry
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class SupplierProfileSerializer(serializers.ModelSerializer):
    introduction_video_url = serializers.SerializerMethodField()

    class Meta:
        model = SupplierProfile
        exclude = ('user', 'created_at', 'updated_at')

    def get_introduction_video_url(self, obj):
        if obj.introduction_video and obj.introduction_video.name:
            return obj.introduction_video.url
        return None

class CompleteSupplierSerializer(serializers.ModelSerializer):
    profile = SupplierProfileSerializer(source='supplier_profile', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'profile']

class FabricSerializer(serializers.ModelSerializer):
    # For returning the image URL when requested
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Fabric
        fields = ['id', 'user', 'color', 'quantite', 'materiel', 'prix', 'description', 'created_at', 'updated_at', 'image_url']
        read_only_fields = ['user', 'color']

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

class FabricOrderSerializer(serializers.ModelSerializer):
    fabric_name = serializers.ReadOnlyField(source='fabric.materiel')
    carrier_id = serializers.SerializerMethodField()
    
    class Meta:
        model = FabricOrder
        fields = '__all__'

    def get_carrier_id(self, obj):
        if obj.carrier_id:
            return obj.carrier_id
        # Fallback: look up in ShipmentRequest
        from actors.delivery.models.models import ShipmentRequest
        shipment = ShipmentRequest.objects.filter(fabric_order_id=obj.id).first()
        if shipment and shipment.carrier_id:
            return shipment.carrier_id
        return None

class JewelrySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Jewelry
        fields = ['id', 'user', 'image', 'name', 'fabric', 'quantite', 'materiel', 'prix', 'type', 'description', 'created_at', 'updated_at', 'image_url']
        read_only_fields = ['user']

    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

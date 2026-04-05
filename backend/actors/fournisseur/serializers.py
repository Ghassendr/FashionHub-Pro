from rest_framework import serializers
from .models import SupplierProfile, Fabric, FabricOrder
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class SupplierProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProfile
        exclude = ('user', 'created_at', 'updated_at')

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
        from actors.delivery.models.models import ShipmentRequest
        shipment = ShipmentRequest.objects.filter(fabric_order_id=obj.id).first()
        if shipment and shipment.carrier_id:
            return shipment.carrier_id
        return None

from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from actors.client.models.models import ClientProfile
from actors.couturehouse.models.models import CoutureHouseProfile
from actors.fournisseur.models import SupplierProfile
from actors.delivery.models.models import Carrier

User = get_user_model()

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['role'] = user.role
        token['account_status'] = user.account_status
        token['name'] = user.username
        return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'account_status')

class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ('phone', 'address')

class CoutureHouseProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoutureHouseProfile
        fields = ('house_name', 'specialization', 'starting_price', 'avg_production_time')

class SupplierProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierProfile
        fields = ('nomOrganization', 'typeProduct', 'specialites', 'numeroLicence', 'siteWeb', 'origin_country', 'min_price_per_meter')

class CarrierProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrier
        fields = ('company_name', 'contact_phone', 'service_type', 'delivery_time_guarantee', 'insurance_coverage')

class RegistrationSerializer(serializers.Serializer):
    # Form 1: Basic
    username = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=True)
    
    # Form 2: Profile (Nested under 'profile')
    profile_data = serializers.JSONField(required=True)
    
    # Form 3: Verification (Nested under 'verification')
    verification_docs = serializers.JSONField(required=False, default=dict)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        profile_data = validated_data.pop('profile_data')
        verification_docs = validated_data.pop('verification_docs', {})
        role = validated_data['role']
        
        # Determine status: clients are auto-active, pros are pending_review
        status = 'active' if role == 'client' else 'pending_review'
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=role,
            account_status=status
        )
        
        # Helper to clean empty strings for decimal fields
        def clean_data(data):
            return {k: (None if v == "" else v) for k, v in data.items()}

        full_profile_data = {**clean_data(profile_data), **verification_docs}

        # Create Profile based on role
        if role == 'client':
            ClientProfile.objects.create(user=user, **profile_data)
        elif role == 'couture_house':
            CoutureHouseProfile.objects.create(user=user, **full_profile_data)
        elif role == 'fournisseur':
            SupplierProfile.objects.create(user=user, **full_profile_data)
        elif role == 'delivery':
            Carrier.objects.create(user=user, **full_profile_data)
            
        return user

from rest_framework import serializers
from django.contrib.auth.models import User
from actors.delivery.models import Carrier, Vehicle, Route, Schedule, ShipmentRequest

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class CarrierSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Carrier
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['carrier']

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'

class RouteSerializer(serializers.ModelSerializer):
    schedules = ScheduleSerializer(many=True, read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    carrier_name = serializers.ReadOnlyField(source='carrier.company_name')
    carrier_rating = serializers.ReadOnlyField(source='carrier.rating')
    carrier_reviews = serializers.ReadOnlyField(source='carrier.review_count')
    
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ['carrier']

class ShipmentRequestSerializer(serializers.ModelSerializer):
    route_details = RouteSerializer(source='route', read_only=True)
    carrier_name = serializers.ReadOnlyField(source='carrier.company_name')
    
    class Meta:
        model = ShipmentRequest
        fields = '__all__'

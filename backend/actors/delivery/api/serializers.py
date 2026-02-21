from rest_framework import serializers
from django.contrib.auth.models import User
from actors.delivery.models import Carrier, Vehicle, Route, Schedule

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
    
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ['carrier']

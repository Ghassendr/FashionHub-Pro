from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from .models import Carrier, Vehicle, Route, Schedule
from .serializers import CarrierSerializer, VehicleSerializer, RouteSerializer, ScheduleSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(carrier__user=self.request.user)

    def create(self, request, *args, **kwargs):
        print("Vehicle CREATE payload:", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("Vehicle CREATE errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        carrier, created = Carrier.objects.get_or_create(user=self.request.user, defaults={'company_name': self.request.user.username})
        serializer.save(carrier=carrier)

class RouteViewSet(viewsets.ModelViewSet):
    serializer_class = RouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Route.objects.filter(carrier__user=self.request.user)

    def perform_create(self, serializer):
        carrier, created = Carrier.objects.get_or_create(user=self.request.user, defaults={'company_name': self.request.user.username})
        serializer.save(carrier=carrier)

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Schedule.objects.filter(route__carrier__user=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_carrier(request):
    data = request.data
    try:
        user = User.objects.create_user(
            username=data['username'],
            email=data.get('email', ''),
            password=data['password']
        )
        carrier = Carrier.objects.create(
            user=user,
            company_name=data['company_name'],
            contact_phone=data.get('contact_phone', '')
        )
        return Response({'message': 'Carrier created successfully'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

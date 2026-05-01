from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.apps import apps
from actors.delivery.models import Carrier, Vehicle, Route, Schedule, ShipmentRequest
from .serializers import (
    CarrierSerializer, VehicleSerializer, RouteSerializer, 
    ScheduleSerializer, ShipmentRequestSerializer
)

User = get_user_model()

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

class ShipmentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ShipmentRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Carriers only see their own shipments
        carrier = getattr(self.request.user, 'carrier_profile', None)
        if not carrier:
            return ShipmentRequest.objects.none()
        return ShipmentRequest.objects.filter(carrier=carrier).order_by('-created_at')

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Sync with FabricOrder if this is a fabric shipment
        if instance.fabric_order_id:
            try:
                FabricOrder = apps.get_model('fournisseur', 'FabricOrder')
                order = FabricOrder.objects.get(id=instance.fabric_order_id)
                
                # Logic: Shipment status -> Order status
                if instance.status in ['picked_up', 'in_transit']:
                    order.status = 'shipped'
                elif instance.status == 'delivered':
                    order.status = 'delivered'
                elif instance.status == 'cancelled':
                    order.status = 'cancelled'
                
                order.save()
                print(f"Synced Shipment #{instance.id} [{instance.status}] to FabricOrder #{order.id} [{order.status}]")
            except Exception as e:
                print(f"Sync failed for Shipment #{instance.id}: {e}")

        # Sync with Client Order if this is a client shipment
        if instance.client_order_id:
            try:
                Order = apps.get_model('couturehouse', 'Order')
                order = Order.objects.get(id=instance.client_order_id)
                
                # Logic: If picked up or in transit, update Order status if needed
                # (usually Order status stays 'completed' until final 'shipped' confirmation by House,
                # but we can track progress)
                
                # If delivered, we can auto-mark as shipped if paid
                if instance.status == 'delivered' and order.is_paid:
                    order.status = 'shipped'
                    order.save()
            except Exception as e:
                print(f"Sync failed for Client Order: {e}")

    @action(detail=True, methods=['post'])
    def simulate_arrival(self, request, pk=None):
        """
        Simulates that the courier is 15 minutes away from the client.
        """
        instance = self.get_object()
        if not instance.client_order_id:
            return Response({"error": "This is not a client delivery."}, status=status.HTTP_400_BAD_REQUEST)
        
        Order = apps.get_model('couturehouse', 'Order')
        order = Order.objects.get(id=instance.client_order_id)
        
        order.delivery_eta_minutes = 15
        order.save()
        
        # Advance shipment status to 'in_transit' if it's still 'pending' or 'accepted'
        if instance.status in ['pending', 'accepted', 'picked_up']:
            instance.status = 'in_transit'
            instance.save()

        return Response({"success": True, "message": "Simulation: Livreur à 15 minutes."})

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """
        PATCH api/delivery/shipments/{id}/status/
        Called by the DeliveryDashboard to advance the shipment lifecycle.
        """
        try:
            new_status = request.data.get('status')
            if not new_status:
                return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                shipment = ShipmentRequest.objects.get(pk=pk)
            except ShipmentRequest.DoesNotExist:
                return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)

            # Soft ownership check — only enforce if user actually has a carrier profile
            carrier = getattr(request.user, 'carrier_profile', None)
            if carrier is not None and shipment.carrier_id != carrier.id:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

            shipment.status = new_status
            shipment.save()

            # Sync FabricOrder status
            if shipment.fabric_order_id:
                try:
                    FabricOrder = apps.get_model('fournisseur', 'FabricOrder')
                    order = FabricOrder.objects.filter(id=shipment.fabric_order_id).first()
                    if order:
                        if new_status == 'picked_up':
                            order.status = 'shipped'
                            order.save()
                        elif new_status == 'in_transit':
                            order.status = 'in_transit'
                            order.save()
                        elif new_status == 'delivered':
                            order.status = 'delivered'
                            order.save()
                        print(f"Synced Shipment #{shipment.id} [{new_status}] -> FabricOrder #{order.id} [{order.status}]")
                except Exception as sync_err:
                    print(f"Warning: FabricOrder sync failed for Shipment #{shipment.id}: {sync_err}")

            # Return simple safe response — avoid nested serializer crashes
            return Response({
                'id': shipment.id,
                'status': shipment.status,
                'source_name': shipment.source_name,
                'dest_name': shipment.dest_name,
                'fabric_order_id': shipment.fabric_order_id,
                'updated_at': shipment.updated_at.isoformat() if shipment.updated_at else None,
            })

        except Exception as e:
            import traceback
            print(f"ERROR in update_status: {traceback.format_exc()}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.AllowAny]) # Couture House might call this before being authenticated as Carrier
def match_delivery(request):
    """
    Search for routes matching start and end locations.
    Example: Nice -> Sousse
    """
    start = request.query_params.get('start')
    end = request.query_params.get('end')
    
    if not start or not end:
        # For demo purposes, if no params, return some routes
        routes = Route.objects.all()[:5]
    else:
        routes = Route.objects.filter(
            start_location__icontains=start, 
            end_location__icontains=end
        )
    
    serializer = RouteSerializer(routes, many=True)
    return Response(serializer.data)

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

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def rate_carrier(request, id):
    """
    Couture House rates a Delivery Carrier.
    """
    try:
        from actors.couturehouse.models.models import CoutureHouseProfile
        from actors.delivery.models.models import CarrierReview
        
        carrier = get_object_or_404(Carrier, id=id)
        house_profile = get_object_or_404(CoutureHouseProfile, user=request.user)
        
        rating_val = int(request.data.get('rating', 0))
        
        if not (1 <= rating_val <= 5):
            return Response({"error": "Rating must be between 1 and 5"}, status=400)
            
        review, created = CarrierReview.objects.update_or_create(
            carrier=carrier,
            couture_house=house_profile,
            defaults={'rating': rating_val}
        )
        
        # Recalculate average
        from django.db.models import Avg
        agg = CarrierReview.objects.filter(carrier=carrier).aggregate(Avg('rating'))
        avg_rating = agg['rating__avg'] or 0.0
        
        carrier.rating = avg_rating
        carrier.review_count = CarrierReview.objects.filter(carrier=carrier).count()
        carrier.save()
        
        return Response({
            "message": "Rating submitted successfully.",
            "new_rating": carrier.rating,
            "review_count": carrier.review_count
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_available_carriers(request):
    """
    Returns a list of all active carriers.
    """
    carriers = Carrier.objects.all()
    serializer = CarrierSerializer(carriers, many=True)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def carrier_profile_view(request):
    """
    GET: Retrieve the current carrier profile.
    POST: Update the current carrier profile (supports multipart for video).
    """
    try:
        # Use the related name for cleaner access
        carrier = getattr(request.user, 'carrier_profile', None)
        
        if carrier is None:
            # Fallback: create if missing
            carrier, created = Carrier.objects.get_or_create(
                user=request.user, 
                defaults={'company_name': request.user.username or request.user.email}
            )
        
        if request.method == 'POST':
            data = request.data
            carrier.company_name = data.get('company_name', carrier.company_name)
            carrier.contact_phone = data.get('contact_phone', carrier.contact_phone)
            carrier.service_type = data.get('service_type', carrier.service_type)
            carrier.insurance_coverage = data.get('insurance_coverage', carrier.insurance_coverage)
            carrier.delivery_time_guarantee = data.get('delivery_time_guarantee', carrier.delivery_time_guarantee)
            
            if 'introduction_video' in request.FILES:
                carrier.introduction_video = request.FILES['introduction_video']
            
            carrier.save()
            
        serializer = CarrierSerializer(carrier, context={'request': request})
        return Response(serializer.data)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"ERROR in carrier_profile_view: {error_msg}")
        return Response({'error': str(e), 'details': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

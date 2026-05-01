from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VehicleViewSet, RouteViewSet, ScheduleViewSet, 
    ShipmentRequestViewSet, match_delivery, register_carrier, 
    rate_carrier, carrier_profile_view, list_available_carriers
)

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'shipments', ShipmentRequestViewSet, basename='shipment')

urlpatterns = [
    path('register/', register_carrier, name='register_carrier'),
    path('match/', match_delivery, name='match_delivery'),
    path('carriers/', list_available_carriers, name='list_carriers'),
    path('carriers/<int:id>/rate/', rate_carrier, name='rate_carrier'),
    path('carrier/profile/', carrier_profile_view, name='carrier_profile'),
    path('', include(router.urls)),
]

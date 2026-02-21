from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, RouteViewSet, ScheduleViewSet, register_carrier

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'schedules', ScheduleViewSet, basename='schedule')

urlpatterns = [
    path('register/', register_carrier, name='register_carrier'),
    path('', include(router.urls)),
]

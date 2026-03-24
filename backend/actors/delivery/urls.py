from django.urls import path
from .views import VehicleListView, DashboardKPIView, TripListView, OrderListView

urlpatterns = [
    path('vehicles/', VehicleListView.as_view(), name='delivery-vehicles'),
    path('kpis/', DashboardKPIView.as_view(), name='delivery-kpis'),
    path('trips/', TripListView.as_view(), name='delivery-trips'),
    path('orders/', OrderListView.as_view(), name='delivery-orders'),
]

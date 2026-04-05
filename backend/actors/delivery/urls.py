from django.urls import path
from .views import (
    VehicleListView, DashboardKPIView, TripListView, OrderListView,
    ShipmentRequestListView, SQLRouteListView, UpdateShipmentStatusView
)

urlpatterns = [
    path('vehicles/', VehicleListView.as_view(), name='delivery-vehicles'),
    path('kpis/', DashboardKPIView.as_view(), name='delivery-kpis'),
    path('trips/', TripListView.as_view(), name='delivery-trips'),
    path('orders/', OrderListView.as_view(), name='delivery-orders'),
    path('shipments/', ShipmentRequestListView.as_view(), name='delivery-shipments'),
    path('shipments/<int:shipment_id>/status', UpdateShipmentStatusView.as_view(), name='delivery-shipments-status'),
    path('shipments/<int:shipment_id>/status/', UpdateShipmentStatusView.as_view(), name='delivery-shipments-status-slash'),
    path('routes/', SQLRouteListView.as_view(), name='delivery-routes-sql'),
]

from django.urls import path
from .views import VehicleListView, DashboardKPIView

urlpatterns = [
    path('vehicles/', VehicleListView.as_view(), name='delivery-vehicles'),
    path('kpis/', DashboardKPIView.as_view(), name='delivery-kpis'),
]

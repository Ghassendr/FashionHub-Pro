from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

def root_health(_request):
    """Simple root endpoint mirroring the old Flask '/' health check."""
    return JsonResponse({"status": "ok", "message": "360° Precision AI Django Server Running"})

urlpatterns = [
    path("", root_health, name="root_health"),
    # Actor-based APIs (new structure - enabled)
    path("api/client/", include("actors.client.api.urls")),
    path("api/delivery/", include("actors.delivery.api.urls")),
    path("api/mongo/delivery/", include("actors.delivery.urls")),  # MongoDB endpoints
    # Couturehouse APIs
    path("api/couturehouse/", include("actors.couturehouse.api.urls")),
    # Fournisseur / Supplier APIs
    path("api/", include("actors.fournisseur.urls")),
    # Core APIs (Authentication)
    # path("api/auth/", include("core.auth.urls")),
    # JWT Token endpoints
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

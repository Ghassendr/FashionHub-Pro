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
    path("", include("bodyapi.urls")),
    path("api/strategie_livraison/", include("strategie_livraison.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

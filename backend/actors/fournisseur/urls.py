from django.urls import path
from .views import (
    SignupView, LoginView, VerifyTokenView, ProfileView, LogoutView,
    FabricListView, FabricDetailView, FabricImageView
)

urlpatterns = [
    # Auth endpoints
    path('auth/signup', SignupView.as_view(), name='fournisseur-signup'),
    path('auth/login', LoginView.as_view(), name='fournisseur-login'),
    path('auth/verify-token', VerifyTokenView.as_view(), name='fournisseur-verify-token'),
    path('auth/user/<int:user_id>', ProfileView.as_view(), name='fournisseur-profile-get'),
    path('auth/user/<int:user_id>/update', ProfileView.as_view(), name='fournisseur-profile-update'),
    path('auth/logout', LogoutView.as_view(), name='fournisseur-logout'),
    
    # Fabrics endpoints
    path('fabrics', FabricListView.as_view(), name='fournisseur-fabrics-list'),
    path('fabrics/<int:pk>', FabricDetailView.as_view(), name='fournisseur-fabric-detail'),
    path('images/<int:pk>', FabricImageView.as_view(), name='fournisseur-fabric-image'),
]

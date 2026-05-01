from django.urls import path
from .views import (
    SignupView, LoginView, VerifyTokenView, ProfileView, LogoutView,
    FabricListView, FabricDetailView, FabricImageView,
    PublicFabricListView, NewsFabricsView, TrendingFabricsView, LikeFabricView,
    FabricOrderListView, CreateFabricOrderView, UpdateFabricOrderStatusView,
    JewelryListView, JewelryDetailView, JewelryImageView
)

print("DEBUG: Loading Fournisseur URLs")
urlpatterns = [
    # Diagnostic - MUST BE TOP
    path('orders/create/', CreateFabricOrderView.as_view(), name='fournisseur-orders-create'),
    path('orders/create', CreateFabricOrderView.as_view(), name='fournisseur-orders-create-alias'),

    # Auth endpoints
    path('test-ping', lambda r: __import__('django.http').http.JsonResponse({"status": "ok", "actor": "fournisseur"}), name='fournisseur-ping'),
    path('auth/signup', SignupView.as_view(), name='fournisseur-signup'),
    path('auth/login', LoginView.as_view(), name='fournisseur-login'),
    path('auth/verify-token', VerifyTokenView.as_view(), name='fournisseur-verify-token'),
    path('auth/user/<int:user_id>', ProfileView.as_view(), name='fournisseur-profile-get'),
    path('auth/user/<int:user_id>/update', ProfileView.as_view(), name='fournisseur-profile-update'),
    path('auth/logout', LogoutView.as_view(), name='fournisseur-logout'),
    
    # Fabrics endpoints
    path('fabrics', FabricListView.as_view(), name='fournisseur-fabrics-list'),
    path('public/fabrics', PublicFabricListView.as_view(), name='fournisseur-public-fabrics-list'),
    path('public/fabrics/news', NewsFabricsView.as_view(), name='fournisseur-fabrics-news'),
    path('public/fabrics/trending', TrendingFabricsView.as_view(), name='fournisseur-fabrics-trending'),
    path('fabrics/<int:pk>/like', LikeFabricView.as_view(), name='fournisseur-fabric-like'),
    path('fabrics/<int:pk>', FabricDetailView.as_view(), name='fournisseur-fabric-detail'),
    path('images/<int:pk>', FabricImageView.as_view(), name='fournisseur-fabric-image'),
    
    # Order management
    path('orders/create/', CreateFabricOrderView.as_view(), name='fournisseur-orders-create'),
    path('orders/create', CreateFabricOrderView.as_view(), name='fournisseur-orders-create-alias'),
    path('orders/', FabricOrderListView.as_view(), name='fournisseur-orders-received'),
    path('orders', FabricOrderListView.as_view(), name='fournisseur-orders-received-alias'),
    path('orders/<int:order_id>/status/', UpdateFabricOrderStatusView.as_view(), name='fournisseur-orders-status'),
    path('orders/<int:order_id>/status', UpdateFabricOrderStatusView.as_view(), name='fournisseur-orders-status-alias'),

    # Jewelry endpoints
    path('jewelry', JewelryListView.as_view(), name='fournisseur-jewelry-list'),
    path('jewelry/<int:pk>', JewelryDetailView.as_view(), name='fournisseur-jewelry-detail'),
    path('jewelry/images/<int:pk>', JewelryImageView.as_view(), name='fournisseur-jewelry-image'),
]

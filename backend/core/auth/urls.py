from django.urls import path
from .views import RegisterView, MyTokenObtainPairView, ProfileView, VerifyTokenView
from .admin_views import AdminReviewQueueView, AdminReviewActionView, AdminStatsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='auth_login'),
    path('verify-token', VerifyTokenView.as_view(), name='auth_verify_token'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('profile/<int:user_id>/', ProfileView.as_view(), name='auth_profile_detail'),
    # Admin Review
    path('admin/review-queue/', AdminReviewQueueView.as_view(), name='admin_review_queue'),
    path('admin/review-action/<int:user_id>/', AdminReviewActionView.as_view(), name='admin_review_action'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
]

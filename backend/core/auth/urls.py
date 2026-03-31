from django.urls import path
from .views import RegisterView, MyTokenObtainPairView, ProfileView
from .admin_views import AdminReviewQueueView, AdminReviewActionView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='auth_login'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    # Admin Review
    path('admin/review-queue/', AdminReviewQueueView.as_view(), name='admin_review_queue'),
    path('admin/review-action/<int:user_id>/', AdminReviewActionView.as_view(), name='admin_review_action'),
]

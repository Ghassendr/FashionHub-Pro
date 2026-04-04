from django.urls import path
from .views import RegisterView, MyTokenObtainPairView, ProfileView
from .admin_views import AdminReviewQueueView, AdminReviewActionView, AdminStatsView
from .card_views import BankCardView, AdminCardStatusView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='auth_login'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    # Bank Card
    path('card/', BankCardView.as_view(), name='bank_card'),
    path('admin/card-status/', AdminCardStatusView.as_view(), name='admin_card_status'),
    # Admin Review
    path('admin/review-queue/', AdminReviewQueueView.as_view(), name='admin_review_queue'),
    path('admin/review-action/<int:user_id>/', AdminReviewActionView.as_view(), name='admin_review_action'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
]

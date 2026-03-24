from django.urls import path
from . import views

urlpatterns = [
    path('designs/', views.DesignListCreateView.as_view(), name='design-list'),
    path('designs/<str:id>/', views.DesignDetailView.as_view(), name='design-detail'),
    path('designs/<str:id>/publish/', views.publish_design, name='design-publish'),
    path('designs/<str:id>/archive/', views.archive_design, name='design-archive'),
    path('designs/<str:id>/media/', views.upload_design_media, name='design-media-upload'),
]

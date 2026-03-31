from django.urls import path
from . import views

urlpatterns = [
    path('designs/', views.DesignListCreateView.as_view(), name='design-list'),
    path('designs/<str:id>/', views.DesignDetailView.as_view(), name='design-detail'),
    path('designs/<str:id>/publish/', views.publish_design, name='design-publish'),
    path('designs/<str:id>/archive/', views.archive_design, name='design-archive'),
    path('designs/<str:id>/media/', views.upload_design_media, name='design-media-upload'),
    path('designs/<str:id>/media/<str:filename>', views.DesignMediaView.as_view(), name='design-media-get'),
    
    # Public & Interactive
    path('public/designs/', views.PublicDesignListView.as_view(), name='public-design-list'),
    path('designs/<str:id>/like/', views.toggle_design_like, name='design-like-toggle'),
]

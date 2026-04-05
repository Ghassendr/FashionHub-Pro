from django.urls import path
from . import views

app_name = 'client'

urlpatterns = [
    # Video Upload & Processing
    path('videos/upload', views.upload_video, name='upload_video'),
    path('videos/process', views.process_video, name='process_video'),

    # Results & Files
    path('results/<path:filepath>', views.serve_results, name='serve_results'),

    # Measurements & Data
    path('measurements/<str:run_id>', views.get_measurements, name='get_measurements'),
    path('recommendations/<str:run_id>', views.get_recommendations, name='get_recommendations'),
    path('correct/<str:run_id>', views.correct_measurements, name='correct_measurements'),

    # Run History
    path('runs/', views.list_runs, name='list_runs'),
    path('runs/<str:run_id>', views.get_run_details, name='get_run_details'),
    path('runs/<str:run_id>/status', views.get_run_status, name='get_run_status'),

    # AI Analysis
    path('skin-analysis/', views.analyze_skin_tone, name='skin_analysis'),

    # Projects
    path('projects/', views.handle_projects, name='handle_projects'),
    path('projects/<path:project_id>/submit/', views.submit_project, name='submit_project'),
    path('projects/<path:project_id>/pay/', views.pay_project_order, name='pay_project_order'),
    path('projects/<path:project_id>/', views.get_project_details, name='get_project_details'),

    # Discovery
    path('ateliers/', views.list_ateliers, name='list_ateliers'),
    path('ateliers/<int:atelier_id>/', views.get_atelier_details, name='get_atelier_details'),

    # Health Check
    path('health', views.health_check, name='health_check'),
]


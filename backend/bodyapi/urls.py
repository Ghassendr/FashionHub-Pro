from django.urls import path
from . import views


urlpatterns = [
    path("process", views.process_video, name="process_video"),
    path("results/<path:filepath>", views.serve_results, name="serve_results"),
    path("api/measurements/<str:run_id>", views.get_measurements, name="get_measurements"),
    path("api/recommendations/<str:run_id>", views.get_recommendations, name="get_recommendations"),
    path("api/correct/<str:run_id>", views.correct_measurements, name="correct_measurements"),
    path("health", views.health, name="health"),
]


from django.apps import AppConfig


class ClientConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'actors.client'
    label = 'client'
    verbose_name = 'Client - 3D Body Measurement'

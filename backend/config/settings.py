from pathlib import Path
import os
import mongoengine

# MongoDB Connection
mongoengine.connect(
    db="fashionhub",
    host="127.0.0.1",
    port=27017,
    username="admin",
    password="password",
    authentication_source="admin"
)


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "dev-secret-key-change-in-production"

DEBUG = True

ALLOWED_HOSTS: list[str] = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Actor-based structure
    "actors.client",
    "actors.delivery",
    "actors.couturehouse",
    "actors.fournisseur",
    "core",
    # External dependencies
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "fashionhub",
        "USER": "admin",
        "PASSWORD": "password",
        "HOST": "127.0.0.1", # Running locally outside docker for now, or use docker service name if inside
        "PORT": "5432",
    }
}

AUTH_USER_MODEL = 'core.User'

AUTH_PASSWORD_VALIDATORS: list[dict] = []

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
    'actors.fournisseur.hashers.WerkzeugPasswordHasher',
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Directories for the 3D pipeline (absolute paths)
PIPELINE_ROOT = BASE_DIR / "actors" / "client" / "ml_pipeline"
PIPELINE_UPLOADS = PIPELINE_ROOT / "uploads"
PIPELINE_RESULTS = PIPELINE_ROOT / "results"

os.makedirs(PIPELINE_UPLOADS, exist_ok=True)
os.makedirs(PIPELINE_RESULTS, exist_ok=True)
os.makedirs(MEDIA_ROOT / "couturehouse" / "designs", exist_ok=True)
os.makedirs(MEDIA_ROOT / "atelier_videos", exist_ok=True)
os.makedirs(MEDIA_ROOT / "carrier_videos", exist_ok=True)


CORS_ALLOW_ALL_ORIGINS = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    )
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

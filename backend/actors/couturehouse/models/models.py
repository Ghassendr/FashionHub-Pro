from mongoengine import Document, EmbeddedDocument, fields
from django.conf import settings
from django.db import models as django_models

class CoutureHouseProfile(django_models.Model):
    user = django_models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=django_models.CASCADE, related_name='couture_house_profile')
    house_name = django_models.CharField(max_length=255)
    specialization = django_models.CharField(max_length=255, blank=True)
    starting_price = django_models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_production_time = django_models.CharField(max_length=100, blank=True)
    
    VERIFICATION_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
    )
    verification_status = django_models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')
    
    # Document Verification URLs
    commercial_register_url = django_models.URLField(max_length=500, blank=True)
    id_card_url = django_models.URLField(max_length=500, blank=True)
    
    def __str__(self):
        return self.house_name

class DesignLike(django_models.Model):
    user = django_models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=django_models.CASCADE, related_name='design_likes')
    design_id = django_models.CharField(max_length=24) # MongoDB ObjectId is 24 chars
    created_at = django_models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'design_id')

    def __str__(self):
        return f"{self.user.email} likes design {self.design_id}"

class DesignMedia(EmbeddedDocument):
    """
    Photos et schémas liés à un design (Embedded in Design).
    """
    MEDIA_TYPE_CHOICES = [("photo", "Photo"), ("schema", "Schéma technique")]
    VIEW_ANGLE_CHOICES = [
        ("front", "Face"), ("back", "Dos"), ("detail", "Détail"), 
        ("side", "Profil"), ("other", "Autre")
    ]

    file = fields.StringField(required=True)  # Path relative to media root
    media_type = fields.StringField(choices=MEDIA_TYPE_CHOICES, default="photo")
    view_angle = fields.StringField(choices=VIEW_ANGLE_CHOICES, default="front")
    is_cover = fields.BooleanField(default=False)
    order = fields.IntField(default=0)

class Design(Document):
    """
    Design publié par la Fashion House (MongoDB Document).
    """
    STATUS_CHOICES = [("draft", "Brouillon"), ("published", "Publié"), ("archived", "Archivé")]
    CATEGORY_CHOICES = [
        ("dress", "Robe"), ("jacket", "Veste / Blazer"), ("pants", "Pantalon"),
        ("skirt", "Jupe"), ("coat", "Manteau"), ("suit", "Costume / Tailleur"),
        ("shirt", "Chemise / Blouse"), ("other", "Autre")
    ]

    # Relation vers l'User SQL (fashion_house_id)
    fashion_house_id = fields.IntField(required=True) 
    title = fields.StringField(max_length=200, required=True)
    description = fields.StringField(blank=True)
    category = fields.StringField(choices=CATEGORY_CHOICES, default="dress")
    fabric_suggestions = fields.StringField(blank=True)
    status = fields.StringField(choices=STATUS_CHOICES, default="draft")
    
    MORPHOLOGY_CHOICES = [
        ("H", "Rectangle (H)"),
        ("A", "Pyramide (A)"),
        ("V", "Pyramide Inversée (V)"),
        ("X", "Sablier (X)"),
        ("8", "Huit (8)"),
        ("O", "Ronde (O)")
    ]
    morphologies = fields.ListField(fields.StringField(choices=MORPHOLOGY_CHOICES), default=list)

    # List of embedded media documents
    media = fields.EmbeddedDocumentListField(DesignMedia)
    
    created_at = fields.DateTimeField()
    updated_at = fields.DateTimeField()
    published_at = fields.DateTimeField()

    meta = {
        'collection': 'designs',
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"{self.title} [{self.status}]"

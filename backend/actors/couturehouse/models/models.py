from mongoengine import Document, EmbeddedDocument, fields
from django.conf import settings

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

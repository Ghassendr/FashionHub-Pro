from django.db import models
from django.conf import settings

class ClientProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='client_profile')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    
    def __str__(self):
        return f"Client: {self.user.username}"


# MongoDB Models
from mongoengine import Document, fields, EmbeddedDocument

class ClientProject(Document):
    """
    Client's Design Project saved from the Create Design Wizard.
    Stored in MongoDB due to dynamic complex JSON metrics.
    """
    client_id = fields.IntField(required=True)  # References the SQL Auth user ID
    
    # Complex JSON datasets from the AI pipelines
    scan_result = fields.DictField(default=dict)
    skin_result = fields.DictField(default=dict)
    
    # Explicit user choices
    selected_designs = fields.ListField(fields.StringField(), default=list) # Design ObjectIDs
    selected_fabrics = fields.ListField(fields.IntField(), default=list) # Fabric SQL IDs
    
    status = fields.StringField(choices=["draft", "saved", "sent", "archived"], default="draft")
    
    created_at = fields.DateTimeField()
    updated_at = fields.DateTimeField()

    meta = {
        'collection': 'client_projects',
        'ordering': ['-created_at']
    }

    def __str__(self):
        return f"Project for Client ID {self.client_id} [{self.status}]"

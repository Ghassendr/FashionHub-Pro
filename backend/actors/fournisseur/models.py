from django.db import models
from django.conf import settings

class SupplierProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supplier_profile')
    nom = models.CharField(max_length=100, blank=True)
    prenom = models.CharField(max_length=100, blank=True)
    nomOrganization = models.CharField(max_length=200, blank=True)
    lieu = models.CharField(max_length=200, blank=True)
    typeProduct = models.CharField(max_length=200, blank=True)
    specialites = models.TextField(blank=True)
    numeroLicence = models.CharField(max_length=100, blank=True)
    siteWeb = models.URLField(blank=True)
    nombreEmployes = models.CharField(max_length=50, blank=True)
    anneeCreation = models.CharField(max_length=4, blank=True)
    description = models.TextField(blank=True)
    adresse = models.TextField(blank=True)
    codePostal = models.CharField(max_length=20, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, blank=True)
    nomContact = models.CharField(max_length=100, blank=True)
    prenomContact = models.CharField(max_length=100, blank=True)
    telephoneContact = models.CharField(max_length=50, blank=True)
    # Using JSONField for simple arrays (strings)
    certificationsQualite = models.JSONField(default=list, blank=True)
    
    # Specific fields from user request
    fabric_category = models.CharField(max_length=200, blank=True)
    origin_country = models.CharField(max_length=100, blank=True)
    min_price_per_meter = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    VERIFICATION_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
    )
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')
    
    # Document Verification URLs
    commercial_register_url = models.URLField(max_length=500, blank=True)
    id_card_url = models.URLField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Supplier: {self.nomOrganization} ({self.user.email})"

class Fabric(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fabrics')
    image = models.ImageField(upload_to='fabrics/')
    color = models.JSONField(default=list, blank=True)  # [R, G, B]
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    materiel = models.CharField(max_length=200, blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Fabric ({self.materiel}) by {self.user.email}"

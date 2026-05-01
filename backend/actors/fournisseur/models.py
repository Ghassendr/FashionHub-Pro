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
    
    # Document Verification URLs (Stored as Base64/Texts)
    commercial_register_url = models.TextField(blank=True)
    id_card_url = models.TextField(blank=True)
    fabric_quality_cert_url = models.TextField(blank=True)
    fabric_sample_photos_url = models.TextField(blank=True)
    warehouse_photo_url = models.TextField(blank=True)
    introduction_video = models.FileField(upload_to='supplier_videos/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Supplier: {self.nomOrganization} ({self.user.email})"

class Fabric(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fabrics')
    image = models.ImageField(upload_to='fabrics/')
    color = models.JSONField(default=list, blank=True)  # [R, G, B]
    color_name = models.CharField(max_length=100, blank=True)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    materiel = models.CharField(max_length=200, blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    likes = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Fabric ({self.materiel}) by {self.user.email}"

class FabricLike(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fabric_likes')
    fabric = models.ForeignKey(Fabric, on_delete=models.CASCADE, related_name='fabric_liked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'fabric')

    def __str__(self):
        return f"{self.user.email} likes {self.fabric.materiel}"

class FabricOrder(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('preparing', 'En préparation'),
        ('ready_for_pickup', 'Prêt pour enlèvement'),
        ('shipped', 'Expédié'),
        ('in_transit', 'En cours de livraison'),
        ('delivered', 'Livré'),
        ('received', 'Réceptionné'),
        ('cancelled', 'Annulé'),
    )
    DELIVERY_TYPE_CHOICES = (
        ('standard', 'Standard'),
        ('rapide', 'Rapide'),
        ('urgent', 'Urgent'),
    )
    
    supplier = models.ForeignKey(SupplierProfile, on_delete=models.CASCADE, related_name='received_orders')
    # Using string reference to avoid circular import with couturehouse
    couture_house_id = models.IntegerField() # SQL ID of CoutureHouseProfile
    couture_house_name = models.CharField(max_length=255)
    
    fabric = models.ForeignKey(Fabric, on_delete=models.CASCADE, related_name='orders')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES, default='standard')
    delivery_preference = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Delivery linking
    carrier_id = models.IntegerField(null=True, blank=True)
    route_id = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Fabric Order #{self.id} - {self.fabric.materiel} for {self.couture_house_name}"

class Jewelry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='jewelry')
    image = models.ImageField(upload_to='jewelry/')
    name = models.CharField(max_length=200, blank=True)
    fabric = models.ForeignKey(Fabric, on_delete=models.SET_NULL, null=True, blank=True, related_name='used_in_jewelry')
    quantite = models.IntegerField(default=0)
    materiel = models.CharField(max_length=200, blank=True) # e.g. Gold, Silver
    prix = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    type = models.CharField(max_length=100, blank=True) # e.g. Ring, Necklace
    description = models.TextField(blank=True)
    likes = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Jewelry ({self.name}) by {self.user.email}"

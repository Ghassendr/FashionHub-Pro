from django.db import models
from django.contrib.auth.models import User

class SupplierProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supplier_profile')
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Supplier: {self.nomOrganization} ({self.user.email})"

class Fabric(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fabrics')
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

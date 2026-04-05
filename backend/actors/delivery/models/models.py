from django.db import models
from django.db import models as django_models
from django.conf import settings

class Carrier(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='carrier_profile')
    company_name = models.CharField(max_length=255)
    contact_phone = models.CharField(max_length=50, blank=True)
    
    VERIFICATION_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revision_requested', 'Revision Requested'),
    )
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')
    
    # Specific fields from user request
    service_type = models.CharField(max_length=100, blank=True)
    delivery_time_guarantee = models.CharField(max_length=100, blank=True)
    insurance_coverage = models.CharField(max_length=255, blank=True)
    
    # Quality of Service Metrics
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.50)
    review_count = models.IntegerField(default=12)
    
    # Document Verification URLs (Stored as Base64/Texts)
    commercial_register_url = models.TextField(blank=True)
    id_card_url = models.TextField(blank=True)
    insurance_document_url = models.TextField(blank=True)
    vehicle_photos_url = models.TextField(blank=True)
    luxury_reference_url = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.company_name

class Vehicle(models.Model):
    carrier = models.ForeignKey(Carrier, on_delete=models.CASCADE, related_name='vehicles')
    registration_number = models.CharField(max_length=50, unique=True)
    capacity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    vehicle_type = models.CharField(max_length=100)
    is_available = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.vehicle_type} - {self.registration_number}"

class Route(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Terminé'),
        ('CANCELED', 'Annulé'),
    ]
    
    carrier = models.ForeignKey(Carrier, on_delete=models.CASCADE, related_name='routes')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, related_name='routes')
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estimated_duration_mins = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    services = models.JSONField(default=list) # [{ "type": "standard", "cost": 30, "nature": ["standard"], "eta": "5-7 days" }]
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.start_location} to {self.end_location} ({self.status})"

class Schedule(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='schedules')
    departure_time = models.DateTimeField()
    estimated_arrival_time = models.DateTimeField()
    actual_arrival_time = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Schedule for {self.route.id} at {self.departure_time}"

class ShipmentRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'),
        ('accepted', 'Accepté'),
        ('picked_up', 'Récupéré'),
        ('in_transit', 'En transit'),
        ('delivered', 'Livré'),
        ('cancelled', 'Annulé'),
    )
    
    carrier = models.ForeignKey(Carrier, on_delete=models.CASCADE, related_name='shipments')
    route = models.ForeignKey(Route, on_delete=models.SET_NULL, null=True, related_name='shipments')
    
    # Origins/Destinations can be many actors, so we store names and IDs
    source_name = models.CharField(max_length=255)
    dest_name = models.CharField(max_length=255)
    
    # Link to the underlying order (optional, could be a fabric order or a client order)
    fabric_order_id = models.IntegerField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    pickup_time = models.DateTimeField(null=True, blank=True)
    delivery_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = django_models.DateTimeField(auto_now=True) if 'django_models' in globals() else models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shipment #{self.id} - {self.source_name} to {self.dest_name}"

class CarrierReview(models.Model):
    carrier = models.ForeignKey(Carrier, on_delete=models.CASCADE, related_name='reviews')
    couture_house = models.ForeignKey('couturehouse.CoutureHouseProfile', on_delete=models.CASCADE, related_name='given_carrier_reviews')
    rating = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A Couture House can leave only one persistent rating per carrier
        unique_together = ('carrier', 'couture_house')

    def __str__(self):
        return f"{self.rating} stars for {self.carrier.company_name}"

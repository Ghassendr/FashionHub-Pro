from django.db import models
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
    
    # Document Verification URLs
    commercial_register_url = models.URLField(max_length=500, blank=True)
    id_card_url = models.URLField(max_length=500, blank=True)
    
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

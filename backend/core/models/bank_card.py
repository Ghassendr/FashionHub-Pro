import hashlib
from django.db import models
from django.conf import settings


class BankCard(models.Model):
    """
    One bank card per user — strict 1-to-1 relationship.
    Only the last 4 digits are stored in plain text.
    The full card number is stored as a SHA-256 hash (for uniqueness check only).
    CVV is never stored.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bank_card'
    )
    # Hashed full card number — used only to detect duplicates across accounts
    card_number_hash = models.CharField(max_length=64, unique=True)
    # Last 4 digits — displayed masked to the user
    last_four = models.CharField(max_length=4)
    # Cardholder name — must match the account holder's name
    cardholder_name = models.CharField(max_length=120)
    # Expiry
    expiry_month = models.CharField(max_length=2)
    expiry_year = models.CharField(max_length=2)
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bank_cards'

    def __str__(self):
        return f"Card of {self.user.email} ending in {self.last_four}"

    def masked(self):
        return f"**** **** **** {self.last_four}"

    @staticmethod
    def hash_card_number(number: str) -> str:
        """Returns SHA-256 hash of a card number (digits only)."""
        cleaned = ''.join(filter(str.isdigit, number))
        return hashlib.sha256(cleaned.encode()).hexdigest()

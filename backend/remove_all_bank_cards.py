import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\xampp\\htdocs\\ProjetCTR\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models.user import User
from core.models.bank_card import BankCard

def remove_bank_cards():
    # List all users who have a bank card
    users_with_cards = User.objects.filter(bank_card__isnull=False)
    print(f"Found {users_with_cards.count()} users with bank cards.")
    
    for user in users_with_cards:
        print(f"Removing card for user: {user.email}")
        user.bank_card.delete()
        print("Card removed.")

if __name__ == "__main__":
    remove_bank_cards()

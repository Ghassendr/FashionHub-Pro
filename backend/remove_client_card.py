"""
Script: remove_client_card.py
Usage: python remove_client_card.py <email>
Removes the bank card record for the given client (by email) from the database.
Only the card value is removed — the user account is NOT deleted.
"""
import os
import sys
import django

# Bootstrap Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from core.models import BankCard
from django.contrib.auth import get_user_model

User = get_user_model()

def remove_card(email):
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        print(f"[ERREUR] Aucun utilisateur trouve avec l'email: {email}")
        sys.exit(1)

    try:
        card = user.bank_card
        last_four = card.last_four
        card.delete()
        print(f"[OK] Carte bancaire (se terminant par {last_four}) supprimee pour {email}.")
    except BankCard.DoesNotExist:
        print(f"[INFO] L'utilisateur {email} n'a pas de carte bancaire liee.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        # List all users with cards if no email given
        print("Usage: python remove_client_card.py <email>")
        print("\nUtilisateurs avec une carte bancaire:")
        cards = BankCard.objects.select_related('user').all()
        if not cards:
            print("  (aucun)")
        for c in cards:
            print(f"  - {c.user.email}  =>  **** **** **** {c.last_four}  ({c.cardholder_name})")
        sys.exit(0)

    remove_card(sys.argv[1])

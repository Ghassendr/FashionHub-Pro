import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from core.models import BankCard
from core.models.user import User


class BankCardView(APIView):
    """
    GET    /api/auth/card/   → Retourne la carte masquée de l'utilisateur connecté
    POST   /api/auth/card/   → Ajoute une carte (une seule par utilisateur)
    PUT    /api/auth/card/   → Met à jour la carte (nécessite confirmation mdp)
    DELETE /api/auth/card/   → Supprime la carte (nécessite confirmation mdp)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            card = request.user.bank_card
            return Response({
                'has_card': True,
                'masked': card.masked(),
                'last_four': card.last_four,
                'cardholder_name': card.cardholder_name,
                'expiry_month': card.expiry_month,
                'expiry_year': card.expiry_year,
                'created_at': card.created_at,
            })
        except BankCard.DoesNotExist:
            return Response({'has_card': False})

    def post(self, request):
        user = request.user

        # Already has a card?
        if hasattr(user, 'bank_card'):
            return Response(
                {'error': 'Vous avez déjà une carte bancaire liée à votre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        card_number = data.get('card_number', '').replace(' ', '')
        cardholder_name = data.get('cardholder_name', '').strip()
        expiry_month = data.get('expiry_month', '').strip()
        expiry_year = data.get('expiry_year', '').strip()
        cvv = data.get('cvv', '').strip()

        # Validate card number (16 digits)
        if not re.fullmatch(r'\d{16}', card_number):
            return Response(
                {'error': 'Le numéro de carte doit contenir exactement 16 chiffres.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate expiry
        if not re.fullmatch(r'\d{2}', expiry_month) or not re.fullmatch(r'\d{2}', expiry_year):
            return Response(
                {'error': 'Date d\'expiration invalide. Format attendu : MM/AA.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if int(expiry_month) < 1 or int(expiry_month) > 12:
            return Response(
                {'error': 'Le mois d\'expiration doit être entre 01 et 12.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate CVV (3 or 4 digits)
        if not re.fullmatch(r'\d{3,4}', cvv):
            return Response(
                {'error': 'Le CVV doit contenir 3 ou 4 chiffres.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate cardholder name
        if not cardholder_name:
            return Response(
                {'error': 'Le nom du titulaire est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check card uniqueness (no sharing between accounts)
        card_hash = BankCard.hash_card_number(card_number)
        if BankCard.objects.filter(card_number_hash=card_hash).exists():
            return Response(
                {'error': '❌ Cette carte est déjà associée à un autre compte. Chaque utilisateur doit utiliser sa propre carte.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the card
        card = BankCard.objects.create(
            user=user,
            card_number_hash=card_hash,
            last_four=card_number[-4:],
            cardholder_name=cardholder_name,
            expiry_month=expiry_month,
            expiry_year=expiry_year,
        )

        return Response({
            'success': True,
            'message': f'✅ Carte bancaire liée avec succès — se terminant par {card.last_four}.',
            'masked': card.masked(),
            'last_four': card.last_four,
            'cardholder_name': card.cardholder_name,
            'expiry_month': card.expiry_month,
            'expiry_year': card.expiry_year,
        }, status=status.HTTP_201_CREATED)

    def put(self, request):
        user = request.user

        # Must have a card
        try:
            card = user.bank_card
        except BankCard.DoesNotExist:
            return Response(
                {'error': 'Aucune carte à modifier.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Confirm password
        password = request.data.get('password', '')
        if not user.check_password(password):
            return Response(
                {'error': 'Mot de passe incorrect. Modification refusée.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data
        card_number = data.get('card_number', '').replace(' ', '')
        cardholder_name = data.get('cardholder_name', card.cardholder_name).strip()
        expiry_month = data.get('expiry_month', card.expiry_month).strip()
        expiry_year = data.get('expiry_year', card.expiry_year).strip()
        cvv = data.get('cvv', '').strip()

        # Validate new card number if provided
        if card_number:
            if not re.fullmatch(r'\d{16}', card_number):
                return Response(
                    {'error': 'Le numéro de carte doit contenir exactement 16 chiffres.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            new_hash = BankCard.hash_card_number(card_number)
            # Check uniqueness (except for current user's own card)
            if BankCard.objects.filter(card_number_hash=new_hash).exclude(user=user).exists():
                return Response(
                    {'error': '❌ Cette carte est déjà associée à un autre compte.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            card.card_number_hash = new_hash
            card.last_four = card_number[-4:]

        if cardholder_name:
            card.cardholder_name = cardholder_name
        if expiry_month:
            card.expiry_month = expiry_month
        if expiry_year:
            card.expiry_year = expiry_year

        card.save()

        return Response({
            'success': True,
            'message': f'✅ Carte mise à jour — se terminant par {card.last_four}.',
            'masked': card.masked(),
            'last_four': card.last_four,
            'cardholder_name': card.cardholder_name,
            'expiry_month': card.expiry_month,
            'expiry_year': card.expiry_year,
        })

    def delete(self, request):
        user = request.user

        try:
            card = user.bank_card
        except BankCard.DoesNotExist:
            return Response(
                {'error': 'Aucune carte à supprimer.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Confirm password
        password = request.data.get('password', '')
        if not user.check_password(password):
            return Response(
                {'error': 'Mot de passe incorrect. Suppression refusée.'},
                status=status.HTTP_403_FORBIDDEN
            )

        card.delete()
        return Response({
            'success': True,
            'message': 'Carte bancaire supprimée avec succès.'
        })


class AdminCardStatusView(APIView):
    """
    GET /api/auth/admin/card-status/
    Réservé aux admins — retourne le statut de carte de chaque utilisateur (✅/❌).
    Ne retourne JAMAIS les détails de la carte.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff and request.user.role != 'admin':
            return Response(
                {'error': 'Accès refusé. Réservé aux administrateurs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.exclude(role='admin').order_by('date_joined')
        result = []
        for u in users:
            has_card = hasattr(u, 'bank_card')
            result.append({
                'id': u.id,
                'email': u.email,
                'name': u.get_full_name() or u.username,
                'role': u.role,
                'account_status': u.account_status,
                'has_card': has_card,
                'card_status_label': '✅ Liée' if has_card else '❌ Non liée',
            })

        return Response({'users': result})

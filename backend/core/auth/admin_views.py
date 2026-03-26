from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from actors.fournisseur.models import SupplierProfile
from actors.delivery.models.models import Carrier
from actors.couturehouse.models.models import CoutureHouseProfile

User = get_user_model()

class AdminReviewQueueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_users = User.objects.filter(account_status='pending_review')
        results = []
        for user in pending_users:
            profile = None
            if user.role == 'fournisseur':
                profile = SupplierProfile.objects.filter(user=user).first()
            elif user.role == 'delivery':
                profile = Carrier.objects.filter(user=user).first()
            elif user.role == 'couture_house':
                profile = CoutureHouseProfile.objects.filter(user=user).first()
            
            results.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "profile": str(profile) if profile else None,
                "date_joined": user.date_joined
            })
        return Response(results)

class AdminReviewActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        action = request.data.get('action') # 'approve' or 'reject'
        reason = request.data.get('reason', '')
        
        try:
            user = User.objects.get(id=user_id)
            if action == 'approve':
                user.account_status = 'approved'
                # Also update profile verification status
                if hasattr(user, 'supplier_profile'):
                    user.supplier_profile.verification_status = 'approved'
                    user.supplier_profile.save()
                elif hasattr(user, 'carrier_profile'):
                    user.carrier_profile.verification_status = 'approved'
                    user.carrier_profile.save()
                elif hasattr(user, 'couture_house_profile'):
                    user.couture_house_profile.verification_status = 'approved'
                    user.couture_house_profile.save()
            elif action == 'reject':
                user.account_status = 'rejected'
            
            user.save()
            return Response({"message": f"User {action}d successfully"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

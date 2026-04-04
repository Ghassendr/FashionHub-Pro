from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from actors.fournisseur.models import SupplierProfile, Fabric
from actors.delivery.models.models import Carrier, Vehicle, Route
from actors.couturehouse.models.models import CoutureHouseProfile, Design
from django.db.models import Count

User = get_user_model()

def serialize_profile(user):
    """Return a detailed dict of the user's profile based on their role."""
    profile_data = {}
    documents = []

    if user.role == 'fournisseur':
        profile = SupplierProfile.objects.filter(user=user).first()
        if profile:
            profile_data = {
                "nom": profile.nom,
                "prenom": profile.prenom,
                "organization": profile.nomOrganization,
                "lieu": profile.lieu,
                "type_product": profile.typeProduct,
                "specialites": profile.specialites,
                "numero_licence": profile.numeroLicence,
                "site_web": profile.siteWeb,
                "nombre_employes": profile.nombreEmployes,
                "annee_creation": profile.anneeCreation,
                "description": profile.description,
                "adresse": profile.adresse,
                "code_postal": profile.codePostal,
                "ville": profile.ville,
                "pays": profile.pays,
                "nom_contact": profile.nomContact,
                "prenom_contact": profile.prenomContact,
                "telephone_contact": profile.telephoneContact,
                "certifications_qualite": profile.certificationsQualite,
                "fabric_category": profile.fabric_category,
                "origin_country": profile.origin_country,
                "min_price_per_meter": str(profile.min_price_per_meter) if profile.min_price_per_meter else None,
                "verification_status": profile.verification_status,
            }
            if profile.commercial_register_url:
                documents.append({"name": "Registre Commercial", "url": profile.commercial_register_url})
            if profile.id_card_url:
                documents.append({"name": "Carte d'Identité", "url": profile.id_card_url})
            if profile.fabric_quality_cert_url:
                documents.append({"name": "Certificat Qualité", "url": profile.fabric_quality_cert_url})
            if profile.fabric_sample_photos_url:
                documents.append({"name": "Photos Échantillons", "url": profile.fabric_sample_photos_url})
            if profile.warehouse_photo_url:
                documents.append({"name": "Photo Entrepôt", "url": profile.warehouse_photo_url})

    elif user.role == 'couture_house':
        profile = CoutureHouseProfile.objects.filter(user=user).first()
        if profile:
            profile_data = {
                "house_name": profile.house_name,
                "specialization": profile.specialization,
                "starting_price": str(profile.starting_price) if profile.starting_price else None,
                "avg_production_time": profile.avg_production_time,
                "verification_status": profile.verification_status,
            }
            if profile.commercial_register_url:
                documents.append({"name": "Registre Commercial", "url": profile.commercial_register_url})
            if profile.id_card_url:
                documents.append({"name": "Carte d'Identité", "url": profile.id_card_url})
            if profile.portfolio_photos_url:
                documents.append({"name": "Portfolio Photos", "url": profile.portfolio_photos_url})
            if profile.workshop_photo_url:
                documents.append({"name": "Photo Atelier", "url": profile.workshop_photo_url})
            if profile.professional_license_url:
                documents.append({"name": "Licence Professionnelle", "url": profile.professional_license_url})

    elif user.role == 'delivery':
        profile = Carrier.objects.filter(user=user).first()
        if profile:
            profile_data = {
                "company_name": profile.company_name,
                "contact_phone": profile.contact_phone,
                "service_type": profile.service_type,
                "delivery_time_guarantee": profile.delivery_time_guarantee,
                "insurance_coverage": profile.insurance_coverage,
                "verification_status": profile.verification_status,
            }
            if profile.commercial_register_url:
                documents.append({"name": "Registre Commercial", "url": profile.commercial_register_url})
            if profile.id_card_url:
                documents.append({"name": "Carte d'Identité", "url": profile.id_card_url})
            if profile.insurance_document_url:
                documents.append({"name": "Document Assurance", "url": profile.insurance_document_url})
            if profile.vehicle_photos_url:
                documents.append({"name": "Photos Véhicules", "url": profile.vehicle_photos_url})
            if profile.luxury_reference_url:
                documents.append({"name": "Référence Luxe", "url": profile.luxury_reference_url})

    return profile_data, documents


class AdminReviewQueueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_users = User.objects.filter(account_status='pending_review')
        results = []
        for user in pending_users:
            profile_data, documents = serialize_profile(user)
            
            results.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "date_joined": user.date_joined,
                "profile": profile_data,
                "documents": documents,
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


class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Users & Partners
        total_users = User.objects.count()
        couture_houses = User.objects.filter(role='couture_house').count()
        delivery_partners = User.objects.filter(role='delivery').count()
        clients = User.objects.filter(role='client').count()
        fournisseurs = User.objects.filter(role='fournisseur').count()
        
        pending_review = User.objects.filter(account_status='pending_review').count()
        approved = User.objects.filter(account_status='approved').count()
        rejected = User.objects.filter(account_status='rejected').count()

        # Catalogue & Design
        total_designs = Design.objects.count()
        total_fabrics = Fabric.objects.count()
        fabric_types = Fabric.objects.values('materiel').distinct().count()
        
        # Logistics
        total_vehicles = Vehicle.objects.count()
        available_vehicles = Vehicle.objects.filter(is_available=True).count()
        total_routes = Route.objects.count()
        active_routes = Route.objects.filter(status__in=['PENDING', 'IN_PROGRESS']).count()

        # Top Delivery Zones (Destinations)
        top_destinations = list(Route.objects.values('end_location')
                               .annotate(count=Count('id'))
                               .order_by('-count')[:5])

        # Fabric Origins
        fabric_origins = list(SupplierProfile.objects.values('origin_country')
                             .annotate(count=Count('id'))
                             .order_by('-count')[:5])

        return Response({
            "users": {
                "total": total_users,
                "couture_houses": couture_houses,
                "delivery": delivery_partners,
                "clients": clients,
                "fournisseurs": fournisseurs,
                "status": {
                    "pending": pending_review,
                    "approved": approved,
                    "rejected": rejected
                }
            },
            "catalogue": {
                "designs": total_designs,
                "fabrics": total_fabrics,
                "fabric_types_count": fabric_types
            },
            "logistics": {
                "vehicles": total_vehicles,
                "available_vehicles": available_vehicles,
                "total_routes": total_routes,
                "active_routes": active_routes,
                "top_destinations": top_destinations
            },
            "suppliers": {
                "fabric_origins": fabric_origins
            }
        })

import os
import sys
import django
from pymongo import MongoClient
import base64
from django.core.files.base import ContentFile

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth.models import User
from actors.fournisseur.models import SupplierProfile, Fabric

# Connect to MongoDB
MONGO_URI = "mongodb://localhost:27017/"
DATABASE_NAME = "fashionhub_pro"
client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
users_col = db['users']
fabrics_col = db['fabrics']

def migrate():
    print("Starting migration from MongoDB to Django...")
    
    # Track mappings of Mongo ID to Django User ID for fabrics
    user_mapping = {}

    # 1. Migrate Users
    users = list(users_col.find())
    print(f"Found {len(users)} users in MongoDB.")
    
    for mongo_user in users:
        email = mongo_user.get('email')
        if not email:
            continue
            
        print(f"Migrating user: {email}")
        
        # Check if user already exists
        user, created = User.objects.get_or_create(
            username=email,
            defaults={'email': email}
        )
        
        if created:
            # We prefix the werkzeug hash so our custom Django hasher can pick it up
            # Werkzeug hashes look like pbkdf2:sha256:.... or scrypt:...
            mongo_hash = mongo_user.get('password', '')
            user.password = f"werkzeug${mongo_hash}"
            user.save()
            
            # Create Supplier Profile
            SupplierProfile.objects.create(
                user=user,
                nom=mongo_user.get('nom', ''),
                prenom=mongo_user.get('prenom', ''),
                nomOrganization=mongo_user.get('nomOrganization', ''),
                lieu=mongo_user.get('lieu', ''),
                typeProduct=mongo_user.get('typeProduct', ''),
                specialites=mongo_user.get('specialites', ''),
                numeroLicence=mongo_user.get('numeroLicence', ''),
                siteWeb=mongo_user.get('siteWeb', ''),
                nombreEmployes=mongo_user.get('nombreEmployes', ''),
                anneeCreation=mongo_user.get('anneeCreation', ''),
                description=mongo_user.get('description', ''),
                adresse=mongo_user.get('adresse', ''),
                codePostal=mongo_user.get('codePostal', ''),
                ville=mongo_user.get('ville', ''),
                pays=mongo_user.get('pays', ''),
                nomContact=mongo_user.get('nomContact', ''),
                prenomContact=mongo_user.get('prenomContact', ''),
                telephoneContact=mongo_user.get('telephoneContact', ''),
                certificationsQualite=mongo_user.get('certificationsQualite', []),
            )
            print(f"  -> Created Django User and Profile.")
        else:
            print(f"  -> Django User already exists. Skipping.")
            
        # Store mapping
        user_mapping[str(mongo_user['_id'])] = user

    # 2. Migrate Fabrics
    fabrics = list(fabrics_col.find())
    print(f"\nFound {len(fabrics)} fabrics in MongoDB.")
    
    for mongo_fabric in fabrics:
        mongo_user_id = str(mongo_fabric.get('user_id'))
        if mongo_user_id not in user_mapping:
            print(f"Fabric {mongo_fabric['_id']} belongs to unknown user. Skipping.")
            continue
            
        user = user_mapping[mongo_user_id]
        
        # Check if we already migrated this somehow (by comparing descriptions/quantities if needed)
        # For safety, we just add it
        print(f"Migrating fabric for user {user.email}...")
        
        fabric = Fabric(
            user=user,
            quantite=mongo_fabric.get('quantite', 0),
            materiel=mongo_fabric.get('materiel', ''),
            prix=mongo_fabric.get('prix', 0.0),
            description=mongo_fabric.get('description', ''),
            color=mongo_fabric.get('rgb_color', [])  # The model expects [R,G,B] in 'color'
        )
        
        # Handle Image
        image_data = mongo_fabric.get('image')
        if image_data:
            # image_data is typically a base64 string from frontend upload
            # Or binary. Let's assume it's base64 string because that's what we did in Flask
            try:
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                decoded_image = base64.b64decode(image_data)
                
                # Create a file object
                filename = f"fabric_{fabric.pk or str(mongo_fabric['_id'])}.jpg"
                fabric.image.save(filename, ContentFile(decoded_image), save=False)
            except Exception as e:
                print(f"  -> Error migrating image for fabric: {e}")
                
        fabric.save()
        print("  -> Fabric migrated.")

    print("\nMigration Complete!")

if __name__ == "__main__":
    migrate()

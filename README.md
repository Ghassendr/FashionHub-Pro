# FashionHub Pro (ProjetCTR)

**FashionHub Pro** est une plateforme e-commerce innovante qui intègre des technologies avancées de vision par ordinateur pour transformer l'expérience d'achat et la gestion de la chaîne d'approvisionnement dans le secteur de la mode.

---

## 🚀 Fonctionnalités Clés

### 1. Reconstruction 3D & Mesures Corporelles (IA)
- **Traitement Vidéo** : Extraction automatique des paramètres corporels à partir d'une simple vidéo de l'utilisateur.
- **Modélisation SMPL** : Utilisation de modèles de corps humain standards pour une précision optimale.
- **Mesures Automatiques** : Calcul de plus de 20 points de mesure (tour de poitrine, taille, hanches, etc.) avec scores de confiance.
- **Recommandations de Taille** : Système intelligent suggérant la taille idéale (XS-3XL, EU/US/UK) en fonction de la morphologie.

### 2. Écosystème Multiacteurs
- **Portail Client** : Visualisation 3D du corps (format `.glb`) et historique des mesures.
- **Tableau de Bord Fournisseur** : Gestion des stocks, des commandes et des interactions avec les maisons de couture.
- **Fashion House (Maison de Couture)** : Gestion des designs et des collections.
- **Gestion Logistique (Delivery)** : Suivi des livraisons et des flux logistiques.

---

## 🛠️ Pile Technique

### Backend (Django)
- **Framework** : Django & Django REST Framework (DRF)
- **Authentification** : JWT (JSON Web Tokens)
- **IA & Vision** : OpenCV, Mediapipe, NumPy, Scikit-learn
- **Traitement 3D** : Trimesh, Rembg, Onnxruntime
- **Modèles de Corps** : Pipelines basés sur SMPL pour la reconstruction 3D.

### Frontend (React)
- **Framework** : React 19 + Vite
- **Styling** : Tailwind CSS (v4)
- **Visualisation 3D** : Three.js via `@react-three/fiber` et `@react-three/drei`
- **Graphiques** : Recharts & Plotly.js
- **Icônes** : Lucide React

---

## 📂 Structure du Projet

- **`/backend`** : Serveur Django gérant l'API, les modèles d'IA et la logique métier (divisé en `actors` : client, fournisseur, couturehouse, delivery).
- **`/frontend`** : Application React moderne offrant des interfaces fluides pour chaque type d'utilisateur.

---

## ⚙️ Installation et Lancement

### 1. Backend (Django)
1. Naviguer dans le dossier : `cd backend`
2. Activer l'environnement virtuel et lancer le serveur :
   ```powershell
   &".venv\Scripts\python.exe" manage.py runserver
   ```
   *(Note : Assurez-vous d'utiliser le chemin python approprié à votre installation)*

### 2. Frontend (React / Vite)
1. Naviguer dans le dossier : `cd frontend`
2. Installer les dépendances : `npm install`
3. Lancer en mode développement : `npm run dev`

---

## 🔗 Intégration API
Le frontend communique avec le backend via `http://localhost:8000`. Les endpoints principaux sont structurés sous `/api/client/`, `/api/fournisseur/`, etc.

---

## 🗄️ Structure de la Base de Données (Schema)

La plateforme utilise une architecture **1+4** (1 table User centralisée + 4 profils spécifiques).

### 1. Noyau (Auth)
*   **User** : `id`, `email` (login), `password`, `role` (client/pro), `account_status` (active/pending/approved).

### 2. Profils Acteurs
*   **Client** : `user_id`, `phone`, `address`.
*   **Maison de Couture** : `user_id`, `house_name`, `specialization`, `starting_price`, `verification_status`, `docs_urls`.
*   **Fournisseur** : `user_id`, `nomOrganization`, `typeProduct`, `specialites`, `city`, `pays`, `verification_status`.
*   **Transporteur (Carrier)** : `user_id`, `company_name`, `service_type`, `insurance_coverage`.

### 3. Logistique & Inventaire
*   **Fabric** : `id`, `supplier_id`, `materiel`, `prix`, `quantite`, `color` (JSON), `image`.
*   **Vehicle** : `id`, `carrier_id`, `registration_number`, `capacity_kg`, `type`.
*   **Route** : `id`, `carrier_id`, `start/end_location`, `status`.

---

**Statut du Projet** : Phase 2 (API modulaire et reconstruction 3D) complétée. ✅

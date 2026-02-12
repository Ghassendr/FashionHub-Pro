# 360° Precision AI - Plateforme Morphologique pour Couture

## 🎯 Description

Plateforme intelligente d'extraction morphologique à partir de vidéos 360° pour les maisons de couture. Permet à un couturier de créer un costume sur mesure sans déplacement physique du client.

## ✨ Fonctionnalités

### 📹 Traitement Vidéo
- Upload de vidéos 360° (rotation complète du client)
- Extraction automatique de 45 frames optimisées
- Segmentation par IA (MediaPipe Selfie Segmenter)
- Détection de pose (MediaPipe Pose Landmarker)

### 📐 Mesures Corporelles (12+ mesures)
- **Tours**: Poitrine, Taille, Hanches, Cou, Cuisse, Biceps, Poignet
- **Longueurs**: Stature, Entrejambe, Bras, Jambes
- **Largeurs**: Épaules, Dos

### 👤 Analyse Morphologique
- **Classification silhouette**: Mince, Normal, Athlétique, Large
- **Proportions corporelles**: Ratio torse/jambes
- **Analyse posture**: Détection asymétries, inclinaisons

### ✂️ Intelligence Couture
- Recommandations de tailles (EU/US/UK)
- Suggestions de coupe (Ajusté, Classique, Ample)
- Alertes morphologiques pour le couturier

### 🎨 Visualisation
- Modèle 3D interactif (Three.js)
- Graphiques de mesures (Plotly)
- Profil radar morphologique
- Timeline de confiance par frame

## 🚀 Installation

### Prérequis
- Python 3.9+
- pip

### Installation des dépendances

```bash
cd back-end
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
```

### Modèles MediaPipe
Télécharger et placer dans `models/`:
- `selfie_segmenter.tflite` - [Lien](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite)
- `pose_landmarker_full.task` - [Lien](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task)

## 🖥️ Utilisation

### Démarrage du serveur

```bash
python app.py
```

Le serveur démarre sur http://localhost:5000

### Interface Web

1. Ouvrir http://localhost:5000
2. Uploader une vidéo 360° du client
3. Saisir les informations (taille, poids, âge, préférences)
4. Cliquer sur "Lancer l'Analyse"
5. Explorer les résultats dans les différents onglets

## 📡 API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/` | GET | Interface web principale |
| `/process` | POST | Traitement d'une vidéo |
| `/results/<run_id>` | GET | Résultats d'une analyse |
| `/api/measurements/<run_id>` | GET | Mesures uniquement |
| `/api/recommendations/<run_id>` | GET | Recommandations couture |
| `/api/correct/<run_id>` | POST | Corriger une mesure |
| `/health` | GET | État du serveur |

### Exemple d'appel API

```bash
curl -X POST http://localhost:5000/process \
  -F "video=@video_360.mp4" \
  -F "height=175" \
  -F "weight=75" \
  -F "gender=men"
```

## 📁 Structure du Projet

```
back-end/
├── app.py                    # API Flask
├── body_processor.py         # Pipeline de traitement
├── morphology_analyzer.py    # Analyse morphologique
├── fashion_intelligence.py   # Recommandations couture
├── visualization.py          # Génération graphiques
├── templates/
│   └── index.html           # Interface web
├── static/
│   ├── css/
│   └── js/
├── models/                   # Modèles IA
├── uploads/                  # Vidéos uploadées
├── results/                  # Résultats par run_id
└── requirements.txt
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `UPLOAD_FOLDER` | `uploads` | Dossier des vidéos |
| `RESULTS_FOLDER` | `results` | Dossier des résultats |

## 📊 Format des Résultats

```json
{
  "id": "abc12345",
  "status": "completed",
  "measurements": {
    "basics": [...],
    "heights": [...],
    "widths": [...],
    "functional": [...]
  },
  "morphology": {
    "silhouette": {...},
    "proportions": {...},
    "posture": {...}
  },
  "fashion_recommendations": {
    "size_recommendations": {...},
    "cut_recommendations": {...},
    "morphological_alerts": [...]
  },
  "mesh_path": "/results/abc12345/body_mesh.glb",
  "quality_score": 0.85
}
```

## ⚙️ Technologies

- **Backend**: Flask, Python
- **IA/CV**: MediaPipe, OpenCV, NumPy
- **3D**: Trimesh, scikit-image (Marching Cubes)
- **Frontend**: HTML5, CSS3, JavaScript
- **3D Viewer**: Three.js
- **Graphiques**: Plotly

## 📝 Licence

Propriétaire - Usage interne uniquement

## 👥 Contribution

Pour contribuer, veuillez contacter l'équipe de développement.

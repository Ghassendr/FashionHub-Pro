"""
Fashion Intelligence Module - Full-Body Precision 360
Intelligence métier couture: recommandations tailles, coupes, alertes morphologiques
"""

import numpy as np
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


# Tables de tailles standard
SIZE_CHARTS = {
    'EU': {
        'men': {
            'XS': {'chest': (84, 88), 'waist': (70, 74), 'hips': (84, 88)},
            'S': {'chest': (88, 92), 'waist': (74, 78), 'hips': (88, 92)},
            'M': {'chest': (92, 96), 'waist': (78, 82), 'hips': (92, 96)},
            'L': {'chest': (96, 100), 'waist': (82, 86), 'hips': (96, 100)},
            'XL': {'chest': (100, 104), 'waist': (86, 90), 'hips': (100, 104)},
            'XXL': {'chest': (104, 110), 'waist': (90, 96), 'hips': (104, 110)},
        },
        'women': {
            'XS': {'chest': (76, 80), 'waist': (58, 62), 'hips': (84, 88)},
            'S': {'chest': (80, 84), 'waist': (62, 66), 'hips': (88, 92)},
            'M': {'chest': (84, 88), 'waist': (66, 70), 'hips': (92, 96)},
            'L': {'chest': (88, 92), 'waist': (70, 74), 'hips': (96, 100)},
            'XL': {'chest': (92, 96), 'waist': (74, 78), 'hips': (100, 104)},
            'XXL': {'chest': (96, 102), 'waist': (78, 84), 'hips': (104, 110)},
        }
    },
    'US': {
        'men': {
            'XS': {'chest': (33, 35), 'waist': (27, 29), 'hips': (33, 35)},
            'S': {'chest': (35, 37), 'waist': (29, 31), 'hips': (35, 37)},
            'M': {'chest': (37, 39), 'waist': (31, 33), 'hips': (37, 39)},
            'L': {'chest': (39, 41), 'waist': (33, 35), 'hips': (39, 41)},
            'XL': {'chest': (41, 44), 'waist': (35, 38), 'hips': (41, 44)},
            'XXL': {'chest': (44, 47), 'waist': (38, 42), 'hips': (44, 47)},
        },
        'women': {
            'XS': {'chest': (30, 32), 'waist': (23, 25), 'hips': (33, 35)},
            'S': {'chest': (32, 34), 'waist': (25, 27), 'hips': (35, 37)},
            'M': {'chest': (34, 36), 'waist': (27, 29), 'hips': (37, 39)},
            'L': {'chest': (36, 38), 'waist': (29, 31), 'hips': (39, 41)},
            'XL': {'chest': (38, 40), 'waist': (31, 33), 'hips': (41, 43)},
            'XXL': {'chest': (40, 43), 'waist': (33, 36), 'hips': (43, 46)},
        }
    },
    'UK': {
        'men': {
            'XS': {'chest': (84, 88), 'waist': (70, 74), 'hips': (84, 88)},
            'S': {'chest': (88, 92), 'waist': (74, 78), 'hips': (88, 92)},
            'M': {'chest': (92, 96), 'waist': (78, 82), 'hips': (92, 96)},
            'L': {'chest': (96, 100), 'waist': (82, 86), 'hips': (96, 100)},
            'XL': {'chest': (100, 104), 'waist': (86, 90), 'hips': (100, 104)},
            'XXL': {'chest': (104, 110), 'waist': (90, 96), 'hips': (104, 110)},
        },
        'women': {
            '6': {'chest': (76, 80), 'waist': (58, 62), 'hips': (84, 88)},
            '8': {'chest': (80, 84), 'waist': (62, 66), 'hips': (88, 92)},
            '10': {'chest': (84, 88), 'waist': (66, 70), 'hips': (92, 96)},
            '12': {'chest': (88, 92), 'waist': (70, 74), 'hips': (96, 100)},
            '14': {'chest': (92, 96), 'waist': (74, 78), 'hips': (100, 104)},
            '16': {'chest': (96, 102), 'waist': (78, 84), 'hips': (104, 110)},
        }
    }
}

# Styles de coupe
CUT_STYLES = {
    'slim_fit': {
        'fr': 'Coupe ajustée',
        'en': 'Slim Fit',
        'description': 'Coupe près du corps, silhouette épurée',
        'recommended_for': ['slim', 'athletic'],
        'ease_cm': {'chest': 4, 'waist': 2, 'hips': 4}
    },
    'regular_fit': {
        'fr': 'Coupe classique',
        'en': 'Regular Fit',
        'description': 'Coupe traditionnelle, confort optimal',
        'recommended_for': ['normal', 'athletic'],
        'ease_cm': {'chest': 8, 'waist': 6, 'hips': 8}
    },
    'loose_fit': {
        'fr': 'Coupe ample',
        'en': 'Loose Fit',
        'description': 'Coupe décontractée, liberté de mouvement',
        'recommended_for': ['large', 'normal'],
        'ease_cm': {'chest': 12, 'waist': 10, 'hips': 12}
    },
    'tailored_fit': {
        'fr': 'Coupe sur mesure',
        'en': 'Tailored Fit',
        'description': 'Entre ajustée et classique, élégance moderne',
        'recommended_for': ['normal', 'athletic', 'slim'],
        'ease_cm': {'chest': 6, 'waist': 4, 'hips': 6}
    }
}


class SizeRecommender:
    """Recommandation de tailles basée sur les mesures"""
    
    def recommend(self, measurements: Dict, gender: str = 'men', 
                  systems: List[str] = ['EU', 'US', 'UK']) -> Dict:
        """
        Recommande les tailles dans différents systèmes
        
        Args:
            measurements: Mesures corporelles (format plat ou catégorisé)
            gender: 'men' ou 'women'
            systems: Systèmes de tailles à utiliser
        
        Returns:
            Recommandations de tailles par système
        """
        # Extraire les mesures clés
        chest = self._get_measure(measurements, 'chest', 95)
        waist = self._get_measure(measurements, 'waist', 80)
        hips = self._get_measure(measurements, 'hips', 100)
        
        recommendations = {}
        
        for system in systems:
            if system not in SIZE_CHARTS:
                continue
                
            chart = SIZE_CHARTS[system].get(gender, SIZE_CHARTS[system]['men'])
            
            best_size = None
            best_score = float('inf')
            size_details = {}
            
            for size, ranges in chart.items():
                score = 0
                fits = {}
                
                # Score basé sur l'écart aux plages
                for measure_type, (min_val, max_val) in ranges.items():
                    value = locals().get(measure_type, 95)
                    if measure_type == 'chest':
                        value = chest
                    elif measure_type == 'waist':
                        value = waist
                    elif measure_type == 'hips':
                        value = hips
                    
                    # Convertir en inches pour US
                    if system == 'US':
                        value = value / 2.54
                    
                    if min_val <= value <= max_val:
                        fits[measure_type] = 'perfect'
                        score += 0
                    elif value < min_val:
                        fits[measure_type] = 'loose'
                        score += (min_val - value) ** 2
                    else:
                        fits[measure_type] = 'tight'
                        score += (value - max_val) ** 2
                
                size_details[size] = {
                    'score': round(score, 2),
                    'fits': fits
                }
                
                if score < best_score:
                    best_score = score
                    best_size = size
            
            # Déterminer tailles alternatives
            sizes_list = list(chart.keys())
            best_idx = sizes_list.index(best_size) if best_size in sizes_list else 0
            
            alternatives = []
            if best_idx > 0:
                alternatives.append({'size': sizes_list[best_idx - 1], 'note': 'Plus ajusté'})
            if best_idx < len(sizes_list) - 1:
                alternatives.append({'size': sizes_list[best_idx + 1], 'note': 'Plus ample'})
            
            recommendations[system] = {
                'recommended_size': best_size,
                'confidence': max(0.5, 1 - (best_score / 100)),
                'alternatives': alternatives,
                'fit_details': size_details.get(best_size, {}).get('fits', {})
            }
        
        return recommendations
    
    def _get_measure(self, measurements: Dict, key: str, default: float) -> float:
        """Extrait une mesure du dictionnaire"""
        if isinstance(measurements, dict):
            # Format catégorisé
            for category in ['basics', 'widths', 'heights', 'functional']:
                if category in measurements and isinstance(measurements[category], list):
                    for m in measurements[category]:
                        if m.get('key') == key:
                            return m.get('value_cm', default)
            # Format plat (liste de mesures)
            if 'measurements' in measurements:
                for m in measurements.get('measurements', []):
                    if m.get('type') == key or m.get('key') == key:
                        return m.get('value_cm', default)
        return default


class CutRecommender:
    """Recommandation de styles de coupe"""
    
    def recommend(self, morphology: Dict, user_preference: str = None) -> Dict:
        """
        Recommande des styles de coupe basés sur la morphologie
        
        Args:
            morphology: Analyse morphologique (silhouette, proportions, posture)
            user_preference: Préférence utilisateur ('slim', 'regular', 'loose')
        
        Returns:
            Recommandations de coupe avec scores
        """
        silhouette_type = morphology.get('silhouette', {}).get('type', 'normal')
        
        recommendations = []
        
        for cut_key, cut_info in CUT_STYLES.items():
            score = 0
            reasons = []
            
            # Score basé sur la morphologie
            if silhouette_type in cut_info['recommended_for']:
                score += 30
                reasons.append(f"Adapté à votre silhouette {morphology.get('silhouette', {}).get('type_fr', '')}")
            
            # Bonus si correspond à la préférence utilisateur
            if user_preference:
                if (user_preference == 'ajusté' and cut_key in ['slim_fit', 'tailored_fit']) or \
                   (user_preference == 'normal' and cut_key in ['regular_fit', 'tailored_fit']) or \
                   (user_preference == 'large' and cut_key in ['loose_fit', 'regular_fit']):
                    score += 20
                    reasons.append("Correspond à votre préférence")
            
            # Ajustements basés sur la posture
            posture_issues = morphology.get('posture', {}).get('issues', [])
            if posture_issues and cut_key == 'loose_fit':
                score += 10
                reasons.append("Coupe ample recommandée pour asymétries")
            
            # Ajustements basés sur les proportions
            proportion_type = morphology.get('proportions', {}).get('proportion_type', {}).get('type', 'balanced')
            if proportion_type == 'long_torso' and cut_key in ['tailored_fit', 'regular_fit']:
                score += 10
                reasons.append("Équilibre le torse long")
            elif proportion_type == 'long_legs' and cut_key in ['slim_fit', 'tailored_fit']:
                score += 10
                reasons.append("Met en valeur les jambes")
            
            recommendations.append({
                'style': cut_key,
                'name_fr': cut_info['fr'],
                'name_en': cut_info['en'],
                'description': cut_info['description'],
                'score': score,
                'reasons': reasons,
                'ease_cm': cut_info['ease_cm']
            })
        
        # Trier par score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'primary_recommendation': recommendations[0] if recommendations else None,
            'alternatives': recommendations[1:3] if len(recommendations) > 1 else [],
            'all_options': recommendations
        }


class MorphologicalAlerts:
    """Génération d'alertes morphologiques pour le couturier"""
    
    ALERT_RULES = [
        {
            'condition': lambda m: m.get('silhouette', {}).get('ratios', {}).get('shoulder_to_waist', 0.5) > 0.6,
            'alert': {
                'type': 'broad_shoulders',
                'fr': 'Épaules larges',
                'recommendation': 'Prévoir des emmanchures plus larges et un dos ajusté',
                'severity': 'info'
            }
        },
        {
            'condition': lambda m: m.get('silhouette', {}).get('ratios', {}).get('waist_to_hip', 0.8) > 0.95,
            'alert': {
                'type': 'straight_waist',
                'fr': 'Taille peu marquée',
                'recommendation': 'Éviter les coupes trop cintrées, privilégier les coupes droites',
                'severity': 'info'
            }
        },
        {
            'condition': lambda m: m.get('posture', {}).get('type') == 'asymmetric',
            'alert': {
                'type': 'posture_asymmetry',
                'fr': 'Asymétrie posturale détectée',
                'recommendation': 'Prévoir des ajustements asymétriques lors de l\'essayage',
                'severity': 'warning'
            }
        },
        {
            'condition': lambda m: m.get('proportions', {}).get('torso_to_legs_ratio', 0.65) > 0.75,
            'alert': {
                'type': 'long_torso',
                'fr': 'Torse proportionnellement long',
                'recommendation': 'Allonger les vestes, éviter les tailles hautes',
                'severity': 'info'
            }
        },
        {
            'condition': lambda m: m.get('proportions', {}).get('torso_to_legs_ratio', 0.65) < 0.55,
            'alert': {
                'type': 'long_legs',
                'fr': 'Jambes proportionnellement longues',
                'recommendation': 'Raccourcir les vestes, privilégier les tailles hautes',
                'severity': 'info'
            }
        },
        {
            'condition': lambda m: m.get('silhouette', {}).get('bmi', 22) > 30,
            'alert': {
                'type': 'corpulence',
                'fr': 'Corpulence importante',
                'recommendation': 'Prévoir des aisances supplémentaires et des tissus fluides',
                'severity': 'info'
            }
        },
        {
            'condition': lambda m: any(i.get('type') == 'shoulder_asymmetry' for i in m.get('posture', {}).get('issues', [])),
            'alert': {
                'type': 'uneven_shoulders',
                'fr': 'Épaules inégales',
                'recommendation': 'Ajuster les épaulettes de manière asymétrique',
                'severity': 'warning'
            }
        }
    ]
    
    def generate(self, morphology: Dict) -> List[Dict]:
        """
        Génère des alertes morphologiques basées sur l'analyse
        
        Args:
            morphology: Analyse morphologique complète
        
        Returns:
            Liste d'alertes avec recommandations
        """
        alerts = []
        
        for rule in self.ALERT_RULES:
            try:
                if rule['condition'](morphology):
                    alerts.append(rule['alert'])
            except Exception:
                continue
        
        # Trier par sévérité
        severity_order = {'warning': 0, 'info': 1}
        alerts.sort(key=lambda x: severity_order.get(x.get('severity', 'info'), 1))
        
        return alerts


class FashionIntelligence:
    """
    Module principal d'intelligence couture
    Combine recommandations de tailles, coupes et alertes
    """
    
    def __init__(self):
        self.size_recommender = SizeRecommender()
        self.cut_recommender = CutRecommender()
        self.alert_generator = MorphologicalAlerts()
    
    def analyze(self, measurements: Dict, morphology: Dict,
                gender: str = 'men', user_preference: str = None,
                age: int = None) -> Dict:
        """
        Analyse complète pour recommandations couture
        
        Args:
            measurements: Mesures corporelles
            morphology: Analyse morphologique
            gender: 'men' ou 'women'
            user_preference: Préférence de coupe ('ajusté', 'normal', 'large')
            age: Âge du client (optionnel)
        
        Returns:
            Recommandations complètes pour le couturier
        """
        logger.info("Génération des recommandations couture...")
        
        # 1. Recommandations de tailles
        sizes = self.size_recommender.recommend(measurements, gender)
        
        # 2. Recommandations de coupe
        cuts = self.cut_recommender.recommend(morphology, user_preference)
        
        # 3. Alertes morphologiques
        alerts = self.alert_generator.generate(morphology)
        
        # 4. Résumé pour le couturier
        summary = self._generate_tailor_summary(sizes, cuts, alerts, morphology, age)
        
        return {
            'size_recommendations': sizes,
            'cut_recommendations': cuts,
            'morphological_alerts': alerts,
            'tailor_summary': summary,
            'measurements_for_pattern': self._get_pattern_measurements(measurements, cuts)
        }
    
    def _generate_tailor_summary(self, sizes: Dict, cuts: Dict, 
                                  alerts: List[Dict], morphology: Dict,
                                  age: int = None) -> Dict:
        """Génère un résumé textuel pour le couturier"""
        
        # Taille principale
        eu_size = sizes.get('EU', {}).get('recommended_size', 'M')
        
        # Coupe recommandée
        primary_cut = cuts.get('primary_recommendation', {})
        cut_name = primary_cut.get('name_fr', 'Classique')
        
        # Silhouette
        silhouette = morphology.get('silhouette', {}).get('type_fr', 'Normal')
        
        # Construire le résumé
        summary_lines = [
            f"📏 Taille recommandée: {eu_size} (EU)",
            f"✂️ Coupe suggérée: {cut_name}",
            f"👤 Silhouette: {silhouette}"
        ]
        
        if age and age > 50:
            summary_lines.append("💡 Client senior: privilégier le confort et l'aisance")
        
        if alerts:
            summary_lines.append(f"⚠️ {len(alerts)} point(s) d'attention")
        
        return {
            'text_fr': '\n'.join(summary_lines),
            'key_points': {
                'size_eu': eu_size,
                'cut_style': primary_cut.get('style', 'regular_fit'),
                'silhouette': morphology.get('silhouette', {}).get('type', 'normal'),
                'alerts_count': len(alerts)
            }
        }
    
    def _get_pattern_measurements(self, measurements: Dict, cuts: Dict) -> Dict:
        """
        Calcule les mesures ajustées pour le patron
        Ajoute les aisances selon le style de coupe choisi
        """
        # Mesures de base
        base = {
            'chest': self._get_measure(measurements, 'chest', 95),
            'waist': self._get_measure(measurements, 'waist', 80),
            'hips': self._get_measure(measurements, 'hips', 100),
            'shoulders': self._get_measure(measurements, 'shoulders', 45),
            'neck': self._get_measure(measurements, 'neck', 38),
            'arm_length': self._get_measure(measurements, 'inseam', 80),  # Approximation
            'back_length': self._get_measure(measurements, 'stature', 175) * 0.25  # 25% de la taille
        }
        
        # Aisances selon la coupe
        primary_cut = cuts.get('primary_recommendation', {})
        ease = primary_cut.get('ease_cm', {'chest': 8, 'waist': 6, 'hips': 8})
        
        # Mesures ajustées
        pattern = {}
        for key, value in base.items():
            ease_value = ease.get(key, 0)
            pattern[key] = {
                'body_measure': round(value, 1),
                'ease': ease_value,
                'pattern_measure': round(value + ease_value, 1)
            }
        
        return pattern
    
    def _get_measure(self, measurements: Dict, key: str, default: float) -> float:
        """Extrait une mesure du dictionnaire"""
        if isinstance(measurements, dict):
            for category in ['basics', 'widths', 'heights', 'functional']:
                if category in measurements and isinstance(measurements[category], list):
                    for m in measurements[category]:
                        if m.get('key') == key:
                            return m.get('value_cm', default)
        return default

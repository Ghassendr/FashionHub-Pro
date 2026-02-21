"""
Visualization Module - Full-Body Precision 360
Génère des graphiques Plotly pour les mesures corporelles
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
from typing import List, Dict
import os
import json


class PlotGenerator:
    """Génère tous les plots de visualisation"""
    
    @staticmethod
    def create_measurements_bar(measurements: List[Dict], output_path: str = None) -> Dict:
        """Graphique en barres des mesures corporelles"""
        names = [m['name'] for m in measurements]
        values = [m['value_cm'] for m in measurements]
        confidences = [m['confidence'] * 100 for m in measurements]
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=names,
            y=values,
            marker=dict(
                color=values,
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(title="cm")
            ),
            text=[f"{v:.1f} cm" for v in values],
            textposition='outside',
            hovertemplate='<b>%{x}</b><br>Valeur: %{y:.1f} cm<br>Confiance: %{customdata:.0f}%<extra></extra>',
            customdata=confidences
        ))
        
        fig.update_layout(
            title='📏 Mesures Corporelles - Full-Body Precision 360',
            xaxis_title='Mesure',
            yaxis_title='Valeur (cm)',
            template='plotly_white',
            height=500,
            xaxis_tickangle=-45,
            margin=dict(b=120)
        )
        
        if output_path:
            # Sauvegarder seulement en HTML (PNG nécessite Kaleido qui peut timeout)
            html_path = output_path.replace('.png', '.html')
            fig.write_html(html_path)
        
        return {'json': fig.to_json(), 'path': output_path.replace('.png', '.html') if output_path else None}
    
    @staticmethod
    def create_morphology_radar(measurements: List[Dict], output_path: str = None) -> Dict:
        """Graphique radar de la morphologie"""
        # Sélectionner les mesures principales pour le radar
        main_measures = ['chest', 'waist', 'hips', 'shoulders', 'thigh', 'neck']
        
        radar_data = []
        for m in measurements:
            m_key = m.get('key') or m.get('type', '')
            if m_key in main_measures:
                radar_data.append(m)
        
        if len(radar_data) < 3:
            radar_data = [m for m in measurements if m.get('value_cm', 0) > 0][:6]
        
        if not radar_data:
            return {'json': '{}', 'path': None}
        
        categories = [m.get('name', m.get('key', 'Unknown')) for m in radar_data]
        values = [m.get('value_cm', 0) for m in radar_data]
        
        # Normaliser pour une meilleure visualisation
        max_val = max(values)
        normalized = [v / max_val * 100 for v in values]
        
        # Fermer le radar
        categories_closed = categories + [categories[0]]
        normalized_closed = normalized + [normalized[0]]
        values_closed = values + [values[0]]
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatterpolar(
            r=normalized_closed,
            theta=categories_closed,
            fill='toself',
            fillcolor='rgba(99, 110, 250, 0.3)',
            line=dict(color='rgb(99, 110, 250)', width=2),
            name='Morphologie',
            hovertemplate='<b>%{theta}</b><br>%{customdata:.1f} cm<extra></extra>',
            customdata=values_closed
        ))
        
        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 100],
                    ticksuffix='%'
                )
            ),
            title='🎯 Profil Morphologique',
            template='plotly_white',
            height=500,
            showlegend=False
        )
        
        if output_path:
            # Sauvegarder seulement en HTML (PNG nécessite Kaleido qui peut timeout)
            html_path = output_path.replace('.png', '.html')
            fig.write_html(html_path)
        
        return {'json': fig.to_json(), 'path': output_path.replace('.png', '.html') if output_path else None}
    
    @staticmethod
    def create_beta_params(beta: List[float], output_path: str = None) -> Dict:
        """Graphique des paramètres β SMPL"""
        labels = [f'β{i}' for i in range(len(beta))]
        
        colors = ['rgb(239, 85, 59)' if v < 0 else 'rgb(99, 110, 250)' for v in beta]
        
        fig = go.Figure()
        
        fig.add_trace(go.Bar(
            x=labels,
            y=beta,
            marker=dict(color=colors),
            text=[f"{v:.2f}" for v in beta],
            textposition='outside',
            hovertemplate='<b>%{x}</b><br>Valeur: %{y:.3f}<extra></extra>'
        ))
        
        fig.add_hline(y=0, line_dash="dash", line_color="gray")
        
        fig.update_layout(
            title='🧬 Paramètres β (Shape SMPL)',
            xaxis_title='Paramètre',
            yaxis_title='Valeur',
            yaxis=dict(range=[min(beta) - 0.5, max(beta) + 0.5])
        )
        
        if output_path:
            # Sauvegarder seulement en HTML (PNG nécessite Kaleido qui peut timeout)
            html_path = output_path.replace('.png', '.html')
            fig.write_html(html_path)
        
        return {'json': fig.to_json(), 'path': output_path.replace('.png', '.html') if output_path else None}
    
    @staticmethod
    def create_confidence_timeline(frames_data: List[Dict], output_path: str = None) -> Dict:
        """Timeline de confiance par frame"""
        frame_numbers = [f['frame_number'] for f in frames_data]
        confidences = [f['confidence'] * 100 for f in frames_data]
        rotation_angles = [f['rotation_angle'] for f in frames_data]
        body_detected = [f['body_detected'] for f in frames_data]
        
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('Confiance par Frame', 'Angle de Rotation (360°)'),
            vertical_spacing=0.15
        )
        
        # Confiance
        colors = ['green' if bd else 'red' for bd in body_detected]
        fig.add_trace(
            go.Scatter(
                x=frame_numbers,
                y=confidences,
                mode='lines+markers',
                line=dict(color='blue', width=2),
                marker=dict(size=6, color=colors),
                name='Confiance',
                hovertemplate='Frame %{x}<br>Confiance: %{y:.1f}%<extra></extra>'
            ),
            row=1, col=1
        )
        
        fig.add_hline(y=50, line_dash="dash", line_color="red", row=1, col=1)
        
        # Angle de rotation
        fig.add_trace(
            go.Scatter(
                x=frame_numbers,
                y=rotation_angles,
                mode='lines+markers',
                line=dict(color='green', width=2),
                marker=dict(size=6),
                name='Angle',
                hovertemplate='Frame %{x}<br>Angle: %{y:.1f}°<extra></extra>'
            ),
            row=2, col=1
        )
        
        fig.update_xaxes(title_text="Numéro de Frame", row=2, col=1)
        fig.update_yaxes(title_text="Confiance (%)", row=1, col=1)
        fig.update_yaxes(title_text="Angle (°)", row=2, col=1)
        
        fig.update_layout(
            title='📊 Analyse Temporelle du Traitement',
            height=600,
            template='plotly_white',
            showlegend=False
        )
        
        if output_path:
            # Sauvegarder seulement en HTML (PNG nécessite Kaleido qui peut timeout)
            html_path = output_path.replace('.png', '.html')
            fig.write_html(html_path)
        
        return {'json': fig.to_json(), 'path': output_path.replace('.png', '.html') if output_path else None}
    
    @staticmethod
    def create_quality_gauge(quality_score: float, output_path: str = None) -> Dict:
        """Jauge de qualité du traitement"""
        fig = go.Figure()
        
        fig.add_trace(go.Indicator(
            mode="gauge+number+delta",
            value=quality_score * 100,
            title={'text': "Score de Qualité"},
            delta={'reference': 80, 'suffix': '%'},
            number={'suffix': '%'},
            gauge={
                'axis': {'range': [0, 100], 'ticksuffix': '%'},
                'bar': {'color': "darkblue"},
                'steps': [
                    {'range': [0, 50], 'color': "#ff6b6b"},
                    {'range': [50, 75], 'color': "#ffd93d"},
                    {'range': [75, 100], 'color': "#6bcb77"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 85
                }
            }
        ))
        
        fig.update_layout(
            title='🎯 Qualité de la Reconstruction',
            height=350,
            template='plotly_white'
        )
        
        if output_path:
            # Sauvegarder seulement en HTML (PNG nécessite Kaleido qui peut timeout)
            html_path = output_path.replace('.png', '.html')
            fig.write_html(html_path)
        
        return {'json': fig.to_json(), 'path': output_path.replace('.png', '.html') if output_path else None}
    
    def generate_all(self, result: Dict, output_dir: str) -> Dict:
        """Génère tous les plots et retourne leurs chemins"""
        plots_dir = os.path.join(output_dir, 'plots')
        os.makedirs(plots_dir, exist_ok=True)
        
        plots = {}
        
        # Aplatir les mesures si elles sont catégorisées
        raw_measurements = result['measurements']
        flat_measurements = []
        
        if isinstance(raw_measurements, dict):
            # Prioriser 'basics' pour certains graphiques, ou tout mélanger
            # On prend tout pour le bar chart global
            for cat_name, items in raw_measurements.items():
                if isinstance(items, list):
                    flat_measurements.extend(items)
        elif isinstance(raw_measurements, list):
            flat_measurements = raw_measurements
            
        # 1. Mesures en barres (Top 10 ou tout)
        # Filtrer ceux qui ont une valeur numérique valide > 0
        valid_measures = [m for m in flat_measurements if m.get('value_cm', 0) > 0]
        
        plots['measurements_bar'] = self.create_measurements_bar(
            valid_measures[:15], # Limiter aux 15 premiers pour lisibilité
            os.path.join(plots_dir, 'measurements_bar.png')
        )
        
        # 2. Radar morphologie
        plots['morphology_radar'] = self.create_morphology_radar(
            flat_measurements,
            os.path.join(plots_dir, 'morphology_radar.png')
        )
        
        # 3. Paramètres β
        plots['beta_params'] = self.create_beta_params(
            result['beta_parameters'],
            os.path.join(plots_dir, 'beta_params.png')
        )
        
        # 4. Timeline confiance
        if 'frames_data' in result:
            plots['confidence_timeline'] = self.create_confidence_timeline(
                result['frames_data'],
                os.path.join(plots_dir, 'confidence_timeline.png')
            )
        
        # 5. Jauge qualité
        plots['quality_gauge'] = self.create_quality_gauge(
            result['quality_score'],
            os.path.join(plots_dir, 'quality_gauge.png')
        )
        
        # Retourner seulement les chemins
        return {
            name: plot['path'] for name, plot in plots.items() if plot.get('path')
        }


if __name__ == '__main__':
    # Test avec données simulées
    test_result = {
        'measurements': [
            {'type': 'chest', 'name': 'Tour de Poitrine', 'value_cm': 95.2, 'confidence': 0.94},
            {'type': 'waist', 'name': 'Tour de Taille', 'value_cm': 78.5, 'confidence': 0.92},
            {'type': 'hips', 'name': 'Tour de Hanches', 'value_cm': 98.3, 'confidence': 0.95},
        ],
        'beta_parameters': [0.1, -0.3, 0.5, 0.2, -0.1, 0.4, -0.2, 0.3, 0.1, -0.4],
        'frames_data': [
            {'frame_number': i, 'rotation_angle': i * 8, 'confidence': 0.8 + np.random.uniform(-0.1, 0.1), 'body_detected': True}
            for i in range(45)
        ],
        'quality_score': 0.87
    }
    
    generator = PlotGenerator()
    plots = generator.generate_all(test_result, 'test_output')
    print(json.dumps(plots, indent=2))

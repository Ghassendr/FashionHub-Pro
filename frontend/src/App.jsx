import React, { useState, useRef } from 'react';
import axios from 'axios';
import Viewer3D from './components/Viewer3D';
import Plot from 'react-plotly.js';
import './App.css';

function App() {
  // State
  const [formData, setFormData] = useState({
    height: 175,
    weight: 75,
    age: '',
    gender: 'men',
    cut: '',
    quality: 'balanced'
  });
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('viewer');

  const fileInputRef = useRef(null);

  // Handlers
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      // Map legacy IDs to state keys
      [id === 'heightInput' ? 'height' :
        id === 'weightInput' ? 'weight' :
          id === 'ageInput' ? 'age' :
            id === 'genderInput' ? 'gender' :
              id === 'qualityInput' ? 'quality' : 'cut']: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    const data = new FormData();
    data.append('video', file);
    data.append('height', formData.height);
    data.append('weight', formData.weight);
    data.append('age', formData.age);
    data.append('gender', formData.gender);
    data.append('cut_preference', formData.cut);
    data.append('quality', formData.quality);

    try {
      const response = await axios.post('/process', data);
      setResult(response.data);
      setActiveTab('viewer'); // Switch to viewer on success
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render Helpers
  const renderMeasurementItem = (m) => (
    <div className="measurement-item" key={m.key || m.name}>
      <span className="measurement-name">{m.name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="measurement-value">{m.value_cm} cm</span>
        <div className="confidence-bar">
          <div className="confidence-fill" style={{ width: `${(m.confidence || 0.8) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">360°</div>
            <div className="logo-text">
              <h1>360° Precision AI</h1>
              <span>Plateforme Morphologique pour Couture</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Upload Card */}
          <div className="card">
            <div className="card-header">
              <h2>Vidéo 360°</h2>
            </div>
            <div className="card-body">
              <div
                className={`upload-zone ${file ? 'active' : ''}`}
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
                }}
              >
                <p>Glissez votre vidéo 360° ici<br />ou cliquez pour sélectionner</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/*"
                  hidden
                />
                {file && <div className="file-name" style={{ display: 'block' }}>{file.name}</div>}
              </div>
            </div>
          </div>

          {/* User Data Card */}
          <div className="card">
            <div className="card-header">
              <h2>Informations Client</h2>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Taille (cm)</label>
                  <input type="number" className="form-control" id="heightInput"
                    value={formData.height} onChange={handleInputChange} min="100" max="250" step="0.1" />
                </div>
                <div className="form-group">
                  <label>Poids (kg)</label>
                  <input type="number" className="form-control" id="weightInput"
                    value={formData.weight} onChange={handleInputChange} min="30" max="200" step="0.1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Âge (optionnel)</label>
                  <input type="number" className="form-control" id="ageInput"
                    value={formData.age} onChange={handleInputChange} placeholder="Ex: 35" min="10" max="100" />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select className="form-control" id="genderInput"
                    value={formData.gender} onChange={handleInputChange}>
                    <option value="men">Homme</option>
                    <option value="women">Femme</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Préférence de coupe</label>
                <select className="form-control" id="cutInput"
                  value={formData.cut} onChange={handleInputChange}>
                  <option value="">Automatique (IA)</option>
                  <option value="ajusté">Ajusté / Slim</option>
                  <option value="normal">Normal / Regular</option>
                  <option value="large">Ample / Loose</option>
                </select>
              </div>
              <div className="form-group">
                <label>Qualité 3D</label>
                <select className="form-control" id="qualityInput"
                  value={formData.quality} onChange={handleInputChange}>
                  <option value="fast">Rapide (36 vues)</option>
                  <option value="balanced">Équilibré (72 vues)</option>
                  <option value="high">Haute précision (120 vues)</option>
                </select>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={!file || loading}>
            <span>{loading ? 'Analyse en cours...' : "Lancer l'Analyse"}</span>
          </button>

          {/* Quality Score */}
          {result && (
            <div className="card" style={{ display: 'block' }}>
              <div className="card-header">
                <h2>Qualité de l'Analyse</h2>
              </div>
              <div className="card-body">
                <Plot
                  data={[{
                    type: "indicator",
                    mode: "gauge+number",
                    value: (result.quality_score || 0) * 100,
                    gauge: {
                      axis: { range: [0, 100] },
                      bar: { color: "#D4AF37" },
                      steps: [
                        { range: [0, 50], color: "#5A0F1B" },
                        { range: [50, 75], color: "#9BA4B5" },
                        { range: [75, 100], color: "#4CAF50" }
                      ]
                    }
                  }]}
                  layout={{ width: 300, height: 200, margin: { t: 20, b: 20, l: 30, r: 30 }, paper_bgcolor: "rgba(0,0,0,0)" }}
                  config={{ responsive: true, displayModeBar: false }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Results Area */}
        {result && (
          <section className="results-area active">
            <div className="tabs">
              {[
                { id: 'viewer', label: 'Visualisation 3D' },
                { id: 'measurements', label: 'Mensurations' },
                { id: 'morphology', label: 'Morphologie' },
                { id: 'recommendations', label: 'Recommandations' },
                { id: 'charts', label: 'Graphiques' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className={`tab-content ${activeTab === 'viewer' ? 'active' : ''}`}>
              <div className="viewer-3d">
                <Viewer3D url={result.mesh_url} />
              </div>
            </div>

            <div className={`tab-content ${activeTab === 'measurements' ? 'active' : ''}`}>
              <div className="results-grid">
                {['basics', 'heights', 'widths', 'functional'].map(cat => (
                  <div className="card" key={cat}>
                    <div className="card-header">
                      <h2>{cat === 'basics' ? 'Tours (Périmètres)' :
                        cat === 'heights' ? 'Longueurs' :
                          cat === 'widths' ? 'Largeurs' : 'Fonctionnelles'}</h2>
                    </div>
                    <div className="card-body">
                      <div className="measurements-list">
                        {(result?.measurements?.[cat] || []).map(renderMeasurementItem)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`tab-content ${activeTab === 'morphology' ? 'active' : ''}`}>
              <div className="morphology-grid">
                <div className="morphology-card">
                  <h4>Silhouette</h4>
                  <div className="value">{result.morphology?.silhouette?.type_fr || 'Normal'}</div>
                </div>
                <div className="morphology-card">
                  <h4>IMC</h4>
                  <div className="value">{result.morphology?.silhouette?.bmi || '22'}</div>
                </div>
                <div className="morphology-card">
                  <h4>Proportions</h4>
                  <div className="value">{result.morphology?.proportions?.proportion_type?.fr || 'Équilibré'}</div>
                </div>
                <div className="morphology-card">
                  <h4>Posture</h4>
                  <div className="value">{result.morphology?.posture?.type_fr || 'Droite'}</div>
                </div>
                <div className="morphology-card">
                  <h4>Ratio Torse/Jambes</h4>
                  <div className="value">{(result.morphology?.proportions?.torso_to_legs_ratio || 0.65).toFixed(2)}</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header"><h2>Profil Morphologique</h2></div>
                <div className="card-body">
                  {/* Plotly Radar Chart */}
                  <Plot
                    data={[{
                      type: 'scatterpolar',
                      r: (result?.measurements?.basics || []).slice(0, 6).map(m => m.value_cm),
                      theta: (result?.measurements?.basics || []).slice(0, 6).map(m => m.name),
                      fill: 'toself',
                      fillcolor: 'rgba(212, 175, 55, 0.3)',
                      line: { color: '#D4AF37' }
                    }]}
                    layout={{
                      autosize: true,
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      polar: { radialaxis: { visible: true, range: [0, 120] } }
                    }}
                    style={{ width: '100%', height: '400px' }}
                    config={{ displayModeBar: false }}
                  />
                </div>
              </div>
            </div>

            <div className={`tab-content ${activeTab === 'recommendations' ? 'active' : ''}`}>
              <div className="results-grid">
                <div className="card">
                  <div className="card-header"><h2>Tailles Recommandées</h2></div>
                  <div className="card-body">
                    {Object.entries(result.fashion_recommendations?.size_recommendations || {}).map(([sys, data]) => (
                      <div className="recommendation-card" key={sys}>
                        <h4>Taille {sys}</h4>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="size-badge">{data.recommended_size}</div>
                          <div style={{ marginLeft: '1rem' }}>
                            <div style={{ fontWeight: 600 }}>Taille recommandée</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              Confiance: {Math.round((data.confidence || 0.8) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><h2>Style de Coupe</h2></div>
                  <div className="card-body">
                    {result.fashion_recommendations?.cut_recommendations?.primary_recommendation && (
                      <div className="recommendation-card">
                        <h4>{result.fashion_recommendations.cut_recommendations.primary_recommendation.name_fr}</h4>
                        <p>{result.fashion_recommendations.cut_recommendations.primary_recommendation.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`tab-content ${activeTab === 'charts' ? 'active' : ''}`}>
              <div className="results-grid">
                <div className="chart-container">
                  <Plot
                    data={[{
                      x: (result?.measurements?.basics || []).map(m => m.name),
                      y: (result?.measurements?.basics || []).map(m => m.value_cm),
                      type: 'bar',
                      marker: { color: '#D4AF37' }
                    }]}
                    layout={{ title: 'Mesures Corporelles', paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' }}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                  />
                </div>
              </div>
            </div>

          </section>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay active">
          <div className="loading-content">
            <div className="spinner"></div>
            <h3>Analyse en cours...</h3>
            <p>Extraction des frames vidéo</p>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

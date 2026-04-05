import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, Eye, EyeOff, Plus, Trash2, Edit3, AlertTriangle, CheckCircle, X, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './BankCardManager.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BankCardManager = () => {
    const { token } = useAuth();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('view'); // 'view' | 'add' | 'edit' | 'delete'
    const [flipped, setFlipped] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        card_number: '',
        cardholder_name: '',
        expiry_month: '',
        expiry_year: '',
        cvv: '',
        password: '',
    });

    useEffect(() => {
        fetchCard();
    }, [token]);

    const fetchCard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/card/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setCard(data.has_card ? data : null);
        } catch {
            setError('Impossible de charger les informations de carte.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ card_number: '', cardholder_name: '', expiry_month: '', expiry_year: '', cvv: '', password: '' });
        setError('');
        setSuccess('');
    };

    const formatCardNumber = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        const isEdit = mode === 'edit';
        const isDelete = mode === 'delete';
        const method = isDelete ? 'DELETE' : isEdit ? 'PUT' : 'POST';

        const payload = isDelete
            ? { password: form.password }
            : {
                card_number: form.card_number.replace(/\s/g, ''),
                cardholder_name: form.cardholder_name,
                expiry_month: form.expiry_month,
                expiry_year: form.expiry_year,
                cvv: form.cvv,
                ...(isEdit && { password: form.password }),
            };

        try {
            const res = await fetch(`${API}/api/auth/card/`, {
                method,
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Une erreur est survenue.');
            } else {
                setSuccess(data.message || (isDelete ? 'Carte supprimée.' : '✅ Carte enregistrée.'));
                fetchCard();
                setMode('view');
                resetForm();
            }
        } catch {
            setError('Erreur réseau. Veuillez réessayer.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bcm-loading">
                <Loader2 className="bcm-spinner" size={32} />
                <span>Chargement de la carte...</span>
            </div>
        );
    }

    return (
        <div className="bcm-wrapper">
            {/* Header */}
            <div className="bcm-header">
                <div className="bcm-header-left">
                    <CreditCard size={20} className="bcm-icon-gold" />
                    <h3 className="bcm-title">Carte Bancaire</h3>
                </div>
                {card && mode === 'view' && (
                    <div className="bcm-actions-top">
                        <button className="bcm-btn-icon" onClick={() => { resetForm(); setForm(f => ({ ...f, cardholder_name: card.cardholder_name, expiry_month: card.expiry_month, expiry_year: card.expiry_year })); setMode('edit'); }}>
                            <Edit3 size={14} /> Modifier
                        </button>
                        <button className="bcm-btn-icon bcm-btn-danger" onClick={() => { resetForm(); setMode('delete'); }}>
                            <Trash2 size={14} /> Supprimer
                        </button>
                    </div>
                )}
            </div>

            {/* Alert — No card */}
            {!card && mode === 'view' && (
                <div className="bcm-alert-warning">
                    <AlertTriangle size={18} />
                    <p>⚠️ Votre compte n'a pas encore de carte bancaire liée. Veuillez en ajouter une pour continuer.</p>
                    <button className="bcm-btn-add" onClick={() => { resetForm(); setMode('add'); }}>
                        <Plus size={14} /> Ajouter une carte
                    </button>
                </div>
            )}

            {/* Card Visual */}
            {card && mode === 'view' && (
                <div className="bcm-card-visual-wrapper" onClick={() => setFlipped(f => !f)}>
                    <div className={`bcm-card-visual ${flipped ? 'flipped' : ''}`}>
                        {/* Front */}
                        <div className="bcm-card-front">
                            <div className="bcm-card-chip" />
                            <div className="bcm-card-number">{card.masked}</div>
                            <div className="bcm-card-bottom">
                                <div>
                                    <div className="bcm-card-label">Titulaire</div>
                                    <div className="bcm-card-value">{card.cardholder_name.toUpperCase()}</div>
                                </div>
                                <div>
                                    <div className="bcm-card-label">Expiration</div>
                                    <div className="bcm-card-value">{card.expiry_month}/{card.expiry_year}</div>
                                </div>
                            </div>
                            <div className="bcm-card-hint">Cliquez pour retourner</div>
                        </div>
                        {/* Back */}
                        <div className="bcm-card-back">
                            <div className="bcm-card-stripe" />
                            <div className="bcm-card-cvv-row">
                                <span className="bcm-card-label">CVV</span>
                                <div className="bcm-card-cvv-box">● ● ●</div>
                            </div>
                            <div className="bcm-card-secure">
                                <ShieldCheck size={14} />
                                <span>Données sécurisées — CVV non stocké</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            {error && (
                <div className="bcm-msg bcm-msg-error">
                    <X size={16} /> {error}
                </div>
            )}
            {success && (
                <div className="bcm-msg bcm-msg-success">
                    <CheckCircle size={16} /> {success}
                </div>
            )}

            {/* Form */}
            {(mode === 'add' || mode === 'edit') && (
                <form className="bcm-form" onSubmit={handleSubmit}>
                    <div className="bcm-form-title">
                        {mode === 'add' ? '➕ Ajouter une carte' : '✏️ Modifier la carte'}
                    </div>

                    {/* Card Number */}
                    <div className="bcm-field">
                        <label>Numéro de carte</label>
                        <div className="bcm-input-icon-wrap">
                            <CreditCard size={16} className="bcm-input-icon" />
                            <input
                                type="text"
                                placeholder="4242 4242 4242 4242"
                                maxLength={19}
                                value={form.card_number}
                                onChange={e => setForm(f => ({ ...f, card_number: formatCardNumber(e.target.value) }))}
                                required={mode === 'add'}
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="bcm-field">
                        <label>Nom du titulaire</label>
                        <input
                            type="text"
                            placeholder="Prénom NOM"
                            value={form.cardholder_name}
                            onChange={e => setForm(f => ({ ...f, cardholder_name: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Expiry + CVV */}
                    <div className="bcm-field-row">
                        <div className="bcm-field">
                            <label>Mois (MM)</label>
                            <input
                                type="text"
                                placeholder="MM"
                                maxLength={2}
                                value={form.expiry_month}
                                onChange={e => setForm(f => ({ ...f, expiry_month: e.target.value.replace(/\D/g, '') }))}
                                required
                            />
                        </div>
                        <div className="bcm-field">
                            <label>Année (AA)</label>
                            <input
                                type="text"
                                placeholder="AA"
                                maxLength={2}
                                value={form.expiry_year}
                                onChange={e => setForm(f => ({ ...f, expiry_year: e.target.value.replace(/\D/g, '') }))}
                                required
                            />
                        </div>
                        <div className="bcm-field">
                            <label>CVV</label>
                            <div className="bcm-input-icon-wrap">
                                <Lock size={14} className="bcm-input-icon" />
                                <input
                                    type="password"
                                    placeholder="•••"
                                    maxLength={4}
                                    value={form.cvv}
                                    onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }))}
                                    required={mode === 'add'}
                                    onFocus={() => setFlipped(true)}
                                    onBlur={() => setFlipped(false)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Password confirmation (edit only) */}
                    {mode === 'edit' && (
                        <div className="bcm-field">
                            <label><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Confirmez votre mot de passe</label>
                            <input
                                type="password"
                                placeholder="Votre mot de passe actuel"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                            />
                        </div>
                    )}

                    <div className="bcm-form-actions">
                        <button type="submit" className="bcm-btn-primary" disabled={submitting}>
                            {submitting ? <><Loader2 size={14} className="bcm-spinner-sm" /> Enregistrement...</> : 'Confirmer'}
                        </button>
                        <button type="button" className="bcm-btn-secondary" onClick={() => { setMode('view'); resetForm(); }}>
                            Annuler
                        </button>
                    </div>
                </form>
            )}

            {/* Delete confirmation */}
            {mode === 'delete' && (
                <form className="bcm-form bcm-form-delete" onSubmit={handleSubmit}>
                    <div className="bcm-delete-warning">
                        <Trash2 size={32} className="bcm-icon-danger" />
                        <p>Vous êtes sur le point de supprimer la carte se terminant par <strong>{card?.last_four}</strong>.</p>
                        <p className="bcm-delete-sub">Cette action est irréversible. Confirmez votre mot de passe pour continuer.</p>
                    </div>
                    <div className="bcm-field">
                        <label><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Mot de passe</label>
                        <input
                            type="password"
                            placeholder="Votre mot de passe actuel"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                        />
                    </div>
                    <div className="bcm-form-actions">
                        <button type="submit" className="bcm-btn-danger-full" disabled={submitting}>
                            {submitting ? <><Loader2 size={14} className="bcm-spinner-sm" /> Suppression...</> : '🗑 Supprimer définitivement'}
                        </button>
                        <button type="button" className="bcm-btn-secondary" onClick={() => { setMode('view'); resetForm(); }}>
                            Annuler
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default BankCardManager;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Ruler, TrendingUp, Shield, Eye, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TrendingSection from '../components/TrendingSection';
import DesignShowcase from '../components/DesignShowcase';
import { useState, useEffect } from 'react';

const Home = () => {
    const { isAuthenticated, user, setIsRegisterOpen } = useAuth();
    const navigate = useNavigate();

    const [newsFabrics, setNewsFabrics] = useState([]);
    const [trendingFabrics, setTrendingFabrics] = useState([]);
    const [latestDesigns, setLatestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFabrics = async () => {
            const token = localStorage.getItem('token');

            const fetchData = async (url, useAuth = true) => {
                const isValidToken = token && token !== 'null' && token !== 'undefined';
                const headers = (useAuth && isValidToken) ? { 'Authorization': `Bearer ${token}` } : {};
                try {
                    const res = await fetch(url, { headers });
                    if (res.status === 401 && useAuth) {
                        // Retry once without auth if unauthorized (expired token)
                        return fetchData(url, false);
                    }
                    return await res.json();
                } catch (err) {
                    console.error(`Error fetching ${url}:`, err);
                    return null;
                }
            };

            setLoading(true);
            try {
                // Fetch news
                const newsData = await fetchData('http://localhost:8000/api/fournisseur/public/fabrics/news');
                setNewsFabrics(Array.isArray(newsData?.fabrics) ? newsData.fabrics : []);

                // Fetch trending
                const trendingData = await fetchData('http://localhost:8000/api/fournisseur/public/fabrics/trending');
                setTrendingFabrics(Array.isArray(trendingData?.fabrics) ? trendingData.fabrics : []);

                // Fetch latest designs
                const designsData = await fetchData('http://localhost:8000/api/couturehouse/public/designs/');
                setLatestDesigns(Array.isArray(designsData) ? designsData.slice(0, 8) : []);
            } catch (err) {
                console.error("Error in fetchFabrics main loop:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFabrics();
    }, [isAuthenticated]);

    const handleProtectedAction = (e, targetPath) => {
        e.preventDefault();
        if (isAuthenticated) {
            navigate(targetPath);
        } else {
            setIsRegisterOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-noir">
            {/* Hero — Fixed Rhythm & Gaps */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-[140px]">
                {/* Background Image */}
                <div className="absolute inset-0">

                    <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/40 to-noir"></div>
                </div>

                {/* Hero Content */}
                <div className="container-editorial relative z-10 text-center animate-fade-in">
                    <p className="text-label text-gold mb-6 tracking-[0.25em]">HAUTE COUTURE & SMART LOGISTICS</p>
                    <h1 className="font-display text-5xl sm:text-6xl md:text-8xl font-bold text-ivory leading-[0.95] mb-8">
                        Where Art
                        <br />
                        <span className="italic text-gold">Meets Couture</span>
                    </h1>
                    <p className="text-ivory/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                        A centralized platform blending precision 3D body mapping with intelligent logistics — crafted for the world's most discerning fashion houses.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={(e) => handleProtectedAction(e, '/client/onboarding')}
                            className="btn btn-primary"
                        >
                            Explore Collection <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Scroll Indicator — Fixed Positioning */}
                    <div className="mt-[60px] flex flex-col items-center gap-3 animate-shimmer">
                        <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/50"></div>
                        <span className="text-label text-gold/50 text-[9px] tracking-[0.2em] uppercase">Scroll</span>
                    </div>
                </div>
            </section>

            {/* Editorial Section — Precision Mapping Reformatted */}
            <section className="section-rhythm relative">
                <div className="container-editorial">
                    <div className="flex flex-col items-center text-center">
                        <p className="text-label text-gold mb-6">The Atelier</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-6 leading-tight">
                            Precision 3D
                            <br />
                            <span className="italic text-ivory/60">Body Mapping</span>
                        </h2>
                        <div className="divider-gold mb-8"></div>
                        <p className="text-ivory/50 leading-relaxed mb-8 max-w-2xl mx-auto">
                            Our platform seamlessly integrates AI-powered 3D body measurement technology to simulate ergonomic fits for the manufacturing floor. Every measurement, every contour — captured with couture precision.
                        </p>
                        <button
                            onClick={(e) => handleProtectedAction(e, '/client/3d-measurements')}
                            className="btn btn-secondary"
                        >
                            Try 3D Measurements <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </section>
            {/* New Arrivals */}
            {newsFabrics?.length > 0 && (
                <div className="border-t border-subtle/30 bg-noir">
                    <TrendingSection
                        title="Latest Arrivals"
                        subtitle="New Collections"
                        icon={<Sparkles size={16} />}
                        fabrics={newsFabrics}
                    />
                </div>
            )}

            {/* Trending Fabrics */}
            {trendingFabrics?.length > 0 && (
                <div className="border-t border-subtle/30 bg-noir">
                    <TrendingSection
                        title="Trending Now"
                        subtitle="Highly Requested"
                        icon={<TrendingUp size={16} />}
                        fabrics={trendingFabrics}
                        showLikes={true}
                    />
                </div>
            )}
            {/* Latest Designs Showcase */}
            {latestDesigns?.length > 0 && (
                <div className="border-t border-subtle/30 bg-noir">
                    <DesignShowcase designs={latestDesigns} />
                </div>
            )}



            {/* Services Grid — Defined Spacing & Rhythm */}
            <section className="pt-20 pb-[100px] border-t border-subtle/30">
                <div className="container-editorial">
                    <div className="mb-20 text-center">
                        <p className="text-label text-gold mb-6">Services</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-6">
                            The Smart Ecosystem
                        </h2>
                        <div className="divider-gold mb-8"></div>
                        <p className="text-ivory/40 max-w-xl mx-auto">
                            Intelligent logistics matching, 3D body analysis, and private client services — unified under one refined platform.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
                        <ServiceCard
                            icon={<Ruler size={24} />}
                            title="3D Body Mapping"
                            description="AI-powered measurements with sub-millimeter accuracy for perfect couture fits."
                        />
                        <ServiceCard
                            icon={<TrendingUp size={24} />}
                            title="Route Intelligence"
                            description="Optimize logistics with AI-driven route matching and real-time tracking."
                        />
                        <ServiceCard
                            icon={<Shield size={24} />}
                            title="Secure Handling"
                            description="End-to-end protection for high-value couture shipments worldwide."
                        />
                        <ServiceCard
                            icon={<Sparkles size={24} />}
                            title="Custom Tailoring"
                            description="Step-by-step customization: silhouette, fabric, color, and embellishments."
                        />
                        <ServiceCard
                            icon={<Eye size={24} />}
                            title="Private Consultation"
                            description="Book exclusive sessions with our in-house stylists and couturiers."
                        />
                        <ServiceCard
                            icon={<ArrowRight size={24} />}
                            title="Global Delivery"
                            description="Premium white-glove delivery service to your door, anywhere in the world."
                        />
                    </div>
                </div>
            </section>

            {/* Editorial CTA — Focused Rhythm */}
            <section className="section-rhythm relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80&auto=format&fit=crop"
                        alt="Fashion Editorial"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/90 to-noir/70"></div>
                </div>
                <div className="container-editorial relative z-10 text-center">
                    <div className="max-w-[520px] mx-auto flex flex-col items-center">
                        <p className="text-label text-gold mb-6">Private Clients</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-8 leading-tight">
                            Book Your
                            <br />
                            <span className="italic text-gold">Private Consultation</span>
                        </h2>
                        <p className="text-ivory/40 mb-10 leading-relaxed">
                            Experience a bespoke journey tailored exclusively to your vision. From initial measurements to final delivery — every detail, perfected.
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={(e) => handleProtectedAction(e, '/client/onboarding')}
                                className="btn btn-primary"
                            >
                                Request Appointment <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const ServiceCard = ({ icon, title, description }) => (
    <div className="group bg-muted/30 p-8 border border-subtle/20 hover:border-gold/40 transition-all duration-700 cursor-pointer min-h-[260px] flex flex-col items-center text-center justify-center rounded-sm">
        <div className="text-gold/60 mb-4 group-hover:text-gold transition-all duration-500 transform group-hover:scale-110">
            {icon}
        </div>
        <h3 className="font-display text-xl font-semibold text-ivory mb-[10px] tracking-wide group-hover:text-gold transition-colors duration-500">{title}</h3>
        <p className="text-ivory/40 text-sm leading-relaxed group-hover:text-ivory/60 transition-colors duration-500">{description}</p>
    </div>
);

export default Home;

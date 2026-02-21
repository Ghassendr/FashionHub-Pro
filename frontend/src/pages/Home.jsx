import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Ruler, TrendingUp, Shield, Eye } from 'lucide-react';

const Home = () => {
    return (
        <div className="min-h-screen bg-noir">
            {/* Hero — Full-bleed cinematic */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&q=80&auto=format&fit=crop"
                        alt="Couture Runway"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/40 to-noir"></div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-in">
                    <div className="divider-gold mb-10"></div>
                    <p className="text-label text-gold mb-8">Haute Couture & Smart Logistics</p>
                    <h1 className="font-display text-5xl sm:text-6xl md:text-8xl font-bold text-ivory leading-[0.95] mb-8">
                        Where Art
                        <br />
                        <span className="italic text-gold">Meets Couture</span>
                    </h1>
                    <p className="text-ivory/50 text-lg sm:text-xl max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                        A centralized platform blending precision 3D body mapping with intelligent logistics — crafted for the world's most discerning fashion houses.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/client/onboarding" className="btn btn-primary">
                            Explore Collection <ArrowRight size={16} />
                        </Link>
                        <Link to="/client/dashboard" className="btn btn-secondary">
                            Client Dashboard
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-shimmer">
                    <div className="w-px h-12 bg-gradient-to-b from-transparent to-gold/50"></div>
                    <span className="text-label text-gold/50 text-[9px]">Scroll</span>
                </div>
            </section>

            {/* Editorial Section — Precision Mapping */}
            <section className="py-32 relative">
                <div className="wrapper">
                    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                        <div className="animate-fade-in">
                            <p className="text-label text-gold mb-6">The Atelier</p>
                            <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-8 leading-tight">
                                Precision 3D
                                <br />
                                <span className="italic text-ivory/60">Body Mapping</span>
                            </h2>
                            <div className="divider-gold mx-0 mb-8"></div>
                            <p className="text-ivory/50 leading-relaxed mb-8 max-w-lg">
                                Our platform seamlessly integrates AI-powered 3D body measurement technology to simulate ergonomic fits for the manufacturing floor. Every measurement, every contour — captured with couture precision.
                            </p>
                            <Link to="/client/3d-measurements" className="btn btn-secondary inline-flex">
                                Try 3D Measurements <ArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="aspect-[4/5] bg-muted border border-subtle/50 overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&q=80&auto=format&fit=crop"
                                    alt="Fashion Atelier"
                                    className="w-full h-full object-cover opacity-70 hover:opacity-90 transition-opacity duration-700"
                                />
                            </div>
                            <div className="absolute -bottom-6 -left-6 w-32 h-32 border border-gold/20"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-32 border-t border-subtle/30">
                <div className="wrapper">
                    <div className="text-center mb-20">
                        <p className="text-label text-gold mb-6">Services</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-6">
                            The Smart Ecosystem
                        </h2>
                        <div className="divider-gold mb-8"></div>
                        <p className="text-ivory/40 max-w-xl mx-auto">
                            Intelligent logistics matching, 3D body analysis, and private client services — unified under one refined platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-subtle/30">
                        <ServiceCard
                            icon={<Ruler size={20} />}
                            title="3D Body Mapping"
                            description="AI-powered measurements with sub-millimeter accuracy for perfect couture fits."
                        />
                        <ServiceCard
                            icon={<TrendingUp size={20} />}
                            title="Route Intelligence"
                            description="Optimize logistics with AI-driven route matching and real-time tracking."
                        />
                        <ServiceCard
                            icon={<Shield size={20} />}
                            title="Secure Handling"
                            description="End-to-end protection for high-value couture shipments worldwide."
                        />
                        <ServiceCard
                            icon={<Sparkles size={20} />}
                            title="Custom Tailoring"
                            description="Step-by-step customization: silhouette, fabric, color, and embellishments."
                        />
                        <ServiceCard
                            icon={<Eye size={20} />}
                            title="Private Consultation"
                            description="Book exclusive sessions with our in-house stylists and couturiers."
                        />
                        <ServiceCard
                            icon={<ArrowRight size={20} />}
                            title="Global Delivery"
                            description="Premium white-glove delivery service to your door, anywhere in the world."
                        />
                    </div>
                </div>
            </section>

            {/* Editorial CTA */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80&auto=format&fit=crop"
                        alt="Fashion Editorial"
                        className="w-full h-full object-cover opacity-20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/90 to-noir/70"></div>
                </div>
                <div className="wrapper relative z-10">
                    <div className="max-w-2xl">
                        <p className="text-label text-gold mb-6">Private Clients</p>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory mb-8 leading-tight">
                            Book Your
                            <br />
                            <span className="italic text-gold">Private Consultation</span>
                        </h2>
                        <p className="text-ivory/40 mb-10 leading-relaxed max-w-lg">
                            Experience a bespoke journey tailored exclusively to your vision. From initial measurements to final delivery — every detail, perfected.
                        </p>
                        <Link to="/client/onboarding" className="btn btn-primary">
                            Request Appointment <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

const ServiceCard = ({ icon, title, description }) => (
    <div className="group bg-noir p-10 border border-subtle/10 hover:border-gold/20 transition-all duration-700 cursor-pointer">
        <div className="text-gold/60 mb-6 group-hover:text-gold transition-colors duration-500">
            {icon}
        </div>
        <h3 className="font-display text-lg font-semibold text-ivory mb-3 tracking-wide">{title}</h3>
        <p className="text-ivory/35 text-sm leading-relaxed">{description}</p>
    </div>
);

export default Home;

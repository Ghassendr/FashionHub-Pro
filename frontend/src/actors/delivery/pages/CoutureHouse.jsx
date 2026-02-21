import React from 'react';

const CoutureHouse = () => {
    return (
        <div className="wrapper py-24 min-h-screen flex flex-col items-center justify-center text-center">
            <div className="badge mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>Atelier Management</div>
            <h1 className="text-5xl md:text-7xl font-display mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                Couture House
            </h1>
            <p className="text-xl text-ivory/70 max-w-2xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                The heart of creation. Design, fabric management, and master tailor coordination.
            </p>
            <div className="flex gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <button className="btn btn-primary">Enter Atelier (Coming Soon)</button>
            </div>
        </div>
    );
};

export default CoutureHouse;

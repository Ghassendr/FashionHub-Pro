import React, { useState } from 'react';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

const StarRater = ({ onRate, isSubmitting, isCompleted, title="Évaluez cette prestation" }) => {
    const [hoverScore, setHoverScore] = useState(0);
    const [selectedScore, setSelectedScore] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    const handleRate = async () => {
        if (selectedScore > 0 && onRate) {
            await onRate(selectedScore);
            setIsEditing(false);
        }
    };

    if (isCompleted && !isEditing) {
        return (
            <div className="relative group flex flex-col items-center justify-center p-6 bg-gold/5 border border-gold/20 rounded-2xl animate-fade-in">
                <CheckCircle2 size={32} className="text-gold mb-2" />
                <span className="text-[10px] uppercase font-black tracking-widest text-gold text-center">Évaluation Enregistrée</span>
                <p className="text-[9px] text-ivory/60 mt-1 uppercase tracking-widest">Merci pour votre retour</p>
                <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => {
                        const star = i + 1;
                        return <Star key={star} size={14} className={star <= selectedScore ? "fill-gold text-gold" : "text-zinc-700"} />
                    })}
                </div>
                <button 
                    onClick={() => setIsEditing(true)}
                    className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] uppercase font-black tracking-widest border border-gold/30 text-gold hover:bg-gold hover:text-noir px-4 py-1.5 rounded-full"
                >
                    Modifier la note
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-noir/50 border border-white/5 rounded-2xl">
            <span className="text-[10px] uppercase font-black tracking-widest text-ivory mb-4 text-center">{title}</span>
            <div className="flex gap-2 group mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onMouseEnter={() => setHoverScore(star)}
                        onMouseLeave={() => setHoverScore(0)}
                        onClick={() => setSelectedScore(star)}
                        className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                    >
                        <Star
                            size={28}
                            className={`transition-colors ${
                                star <= (hoverScore || selectedScore)
                                    ? "fill-gold text-gold" 
                                    : "text-zinc-700"
                            }`}
                        />
                    </button>
                ))}
            </div>
            
            {selectedScore > 0 && (
                <button
                    onClick={handleRate}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gold/10 border border-gold/30 text-gold text-[9px] uppercase font-black tracking-widest rounded-xl hover:bg-gold hover:text-noir transition-all flex items-center gap-2 animate-fade-up"
                >
                    {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Soumettre'}
                </button>
            )}
        </div>
    );
};

export default StarRater;

import React from 'react';
import { Ruler } from 'lucide-react';

export default function Stats({ data }) {
    if (!data || !data.measurements) return null;
    const { measurements } = data;

    const sections = [
        { title: 'Core Measurements', keys: ['chest', 'waist', 'hips'] },
        { title: 'Limbs', keys: ['thigh', 'bicep', 'wrist'] },
        { title: 'Structure', keys: ['shoulders', 'back_width'] }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <Ruler className="text-black" size={20} />
                <h2 className="font-semibold text-gray-900">Analysis Results</h2>
            </div>

            <div className="p-6">
                <div className="space-y-8">
                    {sections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{section.title}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {section.keys.map(key => {
                                    const m = measurements.find(item => item.type === key || item.key === key);
                                    if (!m) return null;
                                    return (
                                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-sm text-gray-500 mb-1">{m.name}</div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {m.value_cm} <span className="text-sm font-normal text-gray-400">cm</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

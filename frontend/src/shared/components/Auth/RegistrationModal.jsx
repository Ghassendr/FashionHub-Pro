import React, { useState } from 'react';
import { X, User, Building2, Truck, Scissors, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../../services/authService';

const RegistrationModal = ({ isOpen, onClose, onSwitchToLogin }) => {
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null);
    const [showTerms, setShowTerms] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [formData, setFormData] = useState({
        // Basic Info (Form 1)
        fullName: '',
        email: '',
        address: '',
        phone: '',
        password: '',
        passwordVerify: '',
        agreeRules: false,

        // --- FORM 2: Identity ---
        // Couture House
        companyName: '',
        yearsExperience: '',
        specialization: '', // Haute Couture, Luxury Wedding, Custom Premium
        startingPrice: '',
        productionTime: '',
        // Fournisseur
        textileExperience: '',
        fabricCategory: '', // Silk Premium, Italian Wool, Organic Cotton Luxury, Custom Imported Fabrics
        minPricePerMeter: '',
        originCountry: '',
        // Delivery
        serviceType: '', // Secure Transport, Express Premium
        deliveryTimeGuarantee: '',
        insuranceCoverage: '',
        luxuryTransportExperience: '',

        // --- FORM 3: Quality Proof (Uploads - string for simplicity, would be File in real app) ---
        commercialRegister: '',
        // Couture House
        portfolioPhotos: '',
        workshopPhoto: '',
        ownerId: '',
        professionalLicense: '',
        // Fournisseur
        fabricQualityCert: '',
        fabricSamplePhotos: '',
        warehousePhoto: '',
        // Delivery
        insuranceDocument: '',
        vehiclePhotos: '',
        luxuryReference: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setError(''); // Clear previous errors

        const { name, value, type, checked, files } = e.target;
        
        if (type === 'file' && files && files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    [name]: reader.result // Base64 encoding
                }));
            };
            reader.readAsDataURL(files[0]);
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleRoleSelect = (selectedRole) => {
        setError('');
        setRole(selectedRole);
        setStep(2);
    };

    const handleNext = () => {
        setError('');
        setSuccessMsg('');

        // Validation for Form 1 (Basic Info)
        if (step === 2) {
            const requiredStep1 = ['fullName', 'email', 'phone', 'address', 'password', 'passwordVerify'];
            for (const field of requiredStep1) {
                if (!formData[field].trim()) {
                    setError("Please fill in all basic information fields.");
                    return;
                }
            }

            if (formData.password !== formData.passwordVerify) {
                setError("Passwords do not match.");
                return;
            }
            if (!formData.agreeRules) {
                setError("You must agree to the Terms & Conditions.");
                return;
            }
            if (role === 'Client') {
                handleSubmit(); // Clients only have 2 steps
            } else {
                setStep(3); // Go to Form 2 (Identity)
            }
            return;
        }

        // Validation for Form 2 (Identity)
        if (step === 3) {
            let requiredStep2 = [];
            if (role === 'Couture House') {
                requiredStep2 = ['companyName', 'yearsExperience', 'specialization', 'startingPrice', 'productionTime'];
            } else if (role === 'Fournisseur') {
                requiredStep2 = ['companyName', 'textileExperience', 'fabricCategory', 'minPricePerMeter', 'originCountry'];
            } else if (role === 'Delivery') {
                requiredStep2 = ['companyName', 'serviceType', 'deliveryTimeGuarantee', 'insuranceCoverage', 'luxuryTransportExperience'];
            }

            for (const field of requiredStep2) {
                if (!formData[field] || String(formData[field]).trim() === '') {
                    setError(`Please complete all fields in the ${role} Details form.`);
                    return;
                }
            }

            setStep(4);
            return;
        }
    };

    const handleSubmit = async () => {
        // Validation for Form 3 (Files) if not Client
        if (role !== 'Client' && step === 4) {
            let requiredStep3 = [];
            if (role === 'Couture House') {
                requiredStep3 = ['commercialRegister', 'ownerId', 'portfolioPhotos', 'workshopPhoto', 'professionalLicense'];
            } else if (role === 'Fournisseur') {
                requiredStep3 = ['commercialRegister', 'ownerId', 'fabricSamplePhotos', 'warehousePhoto']; // fabricQualityCert is optional
            } else if (role === 'Delivery') {
                requiredStep3 = ['commercialRegister', 'ownerId', 'insuranceDocument', 'vehiclePhotos']; // luxuryReference is optional
            }

            for (const field of requiredStep3) {
                if (!formData[field]) {
                    setError("Please upload all required verification documents.");
                    return;
                }
            }
        }

        try {
            setError('');
            setSuccessMsg('');

            // Map roles to backend slug format
            const roleMap = {
                'Client': 'client',
                'Couture House': 'couture_house',
                'Fournisseur': 'fournisseur',
                'Delivery': 'delivery'
            };

            const backendRole = roleMap[role];

            // Prepare profile_data based on role
            let profile_data = {};
            if (backendRole === 'client') {
                profile_data = { phone: formData.phone, address: formData.address };
            } else if (backendRole === 'couture_house') {
                profile_data = {
                    house_name: formData.companyName,
                    specialization: formData.specialization,
                    starting_price: formData.startingPrice,
                    avg_production_time: formData.productionTime
                };
            } else if (backendRole === 'fournisseur') {
                profile_data = {
                    nomOrganization: formData.companyName,
                    fabric_category: formData.fabricCategory,
                    origin_country: formData.originCountry,
                    min_price_per_meter: formData.minPricePerMeter
                };
            } else if (backendRole === 'delivery') {
                profile_data = {
                    company_name: formData.companyName,
                    service_type: formData.serviceType,
                    delivery_time_guarantee: formData.deliveryTimeGuarantee,
                    insurance_coverage: formData.insuranceCoverage
                };
            }

            // Prepare verification_docs based on role
            let verification_docs = {
                commercial_register_url: formData.commercialRegister,
            };

            if (backendRole === 'couture_house') {
                verification_docs.id_card_url = formData.ownerId;
                verification_docs.portfolio_photos_url = formData.portfolioPhotos;
                verification_docs.workshop_photo_url = formData.workshopPhoto;
                verification_docs.professional_license_url = formData.professionalLicense;
            } else if (backendRole === 'fournisseur') {
                verification_docs.id_card_url = formData.ownerId;
                verification_docs.fabric_quality_cert_url = formData.fabricQualityCert;
                verification_docs.fabric_sample_photos_url = formData.fabricSamplePhotos;
                verification_docs.warehouse_photo_url = formData.warehousePhoto;
            } else if (backendRole === 'delivery') {
                verification_docs.id_card_url = formData.ownerId;
                verification_docs.insurance_document_url = formData.insuranceDocument;
                verification_docs.vehicle_photos_url = formData.vehiclePhotos;
                verification_docs.luxury_reference_url = formData.luxuryReference;
            }

            const payload = {
                username: formData.email,
                email: formData.email,
                password: formData.password,
                role: backendRole,
                profile_data: profile_data,
                verification_docs: verification_docs
            };

            await authService.signup(payload);

            setSuccessMsg(`Welcome to Maison Tissue! Your registration as a ${role} is complete. ${backendRole !== 'client' ? 'Account pending review.' : ''}`);

            // Auto close after 2 seconds
            setTimeout(() => {
                onClose();
                setStep(1);
                setRole(null);
                setSuccessMsg('');
                // Redirect to login or refresh
                if (onSwitchToLogin) onSwitchToLogin();
            }, 3000);
        } catch (err) {
            setError(err.message || "Registration failed. Please try again.");
            console.error(err);
        }
    };

    const renderStepIndicator = () => {
        const totalSteps = role === 'Client' ? 2 : 4;
        return (
            <div className="flex gap-2 mb-8 justify-center">
                {[...Array(totalSteps)].map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1 w-12 rounded-full transition-colors duration-300 ${step >= idx + 1 ? 'bg-gold' : 'bg-subtle'}`}
                    />
                ))}
            </div>
        );
    };

    const renderRoleSelection = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="font-display text-3xl text-center text-ivory mb-2">Select Your Role</h2>
            <p className="text-center text-ivory/50 text-sm mb-8">Choose how you will interact with the platform</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RoleCard
                    icon={<User size={24} />}
                    title="Client"
                    desc="Private clients and fashion enthusiasts"
                    onClick={() => handleRoleSelect('Client')}
                />
                <RoleCard
                    icon={<Scissors size={24} />}
                    title="Couture House"
                    desc="Fashion brands and designers"
                    onClick={() => handleRoleSelect('Couture House')}
                />
                <RoleCard
                    icon={<Building2 size={24} />}
                    title="Fournisseur"
                    desc="Material and fabric suppliers"
                    onClick={() => handleRoleSelect('Fournisseur')}
                />
                <RoleCard
                    icon={<Truck size={24} />}
                    title="Delivery"
                    desc="Logistics and transportation partners"
                    onClick={() => handleRoleSelect('Delivery')}
                />
            </div>
        </div>
    );

    const renderBasicInfo = () => (
        <div className="space-y-6 animate-fade-in">
            <h2 className="font-display text-3xl text-center text-ivory mb-8">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="fullName" label="Full Name" value={formData.fullName} onChange={handleChange} />
                <Input name="email" type="email" label="Email Address" value={formData.email} onChange={handleChange} />
                <Input name="phone" type="tel" label="Phone Number" value={formData.phone} onChange={handleChange} />
                <Input name="address" label="Full Address" value={formData.address} onChange={handleChange} />
                <Input name="password" type="password" label="Password" value={formData.password} onChange={handleChange} />
                <Input name="passwordVerify" type="password" label="Verify Password" value={formData.passwordVerify} onChange={handleChange} />
            </div>

            <div className="flex items-center gap-3 mt-6">
                <input
                    type="checkbox"
                    name="agreeRules"
                    id="agreeRules"
                    checked={formData.agreeRules}
                    onChange={handleChange}
                    className="w-4 h-4 accent-gold bg-subtle border-subtle focus:ring-gold"
                />
                <label htmlFor="agreeRules" className="text-sm text-ivory/70 select-none">
                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-gold hover:underline">Terms & Conditions</button> and House Rules
                </label>
            </div>
        </div>
    );

    const renderForm2 = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                    <p className="text-gold text-xs tracking-widest uppercase mb-2">Form 2</p>
                    <h2 className="font-display text-3xl text-ivory">Professional Identity</h2>
                </div>

                {role === 'Couture House' && (
                    <div className="space-y-4">
                        <Input name="companyName" label="Company Name *" value={formData.companyName} onChange={handleChange} />
                        <Input name="yearsExperience" type="number" label="Years of Experience *" value={formData.yearsExperience} onChange={handleChange} />

                        <div className="flex flex-col gap-2">
                            <label className="text-label">Specialization *</label>
                            <select name="specialization" value={formData.specialization} onChange={handleChange} className="input-couture bg-noir text-ivory [&>option]:bg-noir [&>option]:text-ivory" required>
                                <option value="" disabled className="text-ivory/50">Select Specialization</option>
                                <option value="Haute Couture">Haute Couture</option>
                                <option value="Luxury Wedding">Luxury Wedding</option>
                                <option value="Custom Premium">Custom Premium</option>
                            </select>
                        </div>

                        <Input name="startingPrice" type="number" label="Starting Price per Piece (€) *" value={formData.startingPrice} onChange={handleChange} />
                        <p className="text-xs text-gold/60 -mt-2 mb-2">Important: Enter the minimum price accepted (e.g. 800)</p>

                        <Input name="productionTime" label="Average Production Time *" value={formData.productionTime} onChange={handleChange} />
                    </div>
                )}

                {role === 'Fournisseur' && (
                    <div className="space-y-4">
                        <Input name="companyName" label="Company Name *" value={formData.companyName} onChange={handleChange} />
                        <Input name="textileExperience" type="number" label="Years in Textile Industry *" value={formData.textileExperience} onChange={handleChange} />

                        <div className="flex flex-col gap-2">
                            <label className="text-label">Fabric Category *</label>
                            <select name="fabricCategory" value={formData.fabricCategory} onChange={handleChange} className="input-couture bg-noir text-ivory [&>option]:bg-noir [&>option]:text-ivory" required>
                                <option value="" disabled className="text-ivory/50">Select Category</option>
                                <option value="Silk Premium">Silk Premium</option>
                                <option value="Italian Wool">Italian Wool</option>
                                <option value="Organic Cotton Luxury">Organic Cotton Luxury</option>
                                <option value="Custom Imported Fabrics">Custom Imported Fabrics</option>
                            </select>
                        </div>

                        <Input name="minPricePerMeter" type="number" label="Minimum Price per Meter (€) *" value={formData.minPricePerMeter} onChange={handleChange} />
                        <p className="text-xs text-gold/60 -mt-2 mb-2">Important: Non-premium prices will be automatically rejected.</p>

                        <Input name="originCountry" label="Origin Country of Fabrics *" value={formData.originCountry} onChange={handleChange} />
                    </div>
                )}

                {role === 'Delivery' && (
                    <div className="space-y-4">
                        <Input name="companyName" label="Company Name *" value={formData.companyName} onChange={handleChange} />

                        <div className="flex flex-col gap-2">
                            <label className="text-label">Type of Service *</label>
                            <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="input-couture bg-noir text-ivory [&>option]:bg-noir [&>option]:text-ivory" required>
                                <option value="" disabled className="text-ivory/50">Select Service Type</option>
                                <option value="Secure Transport">Secure Transport</option>
                                <option value="Express Premium">Express Premium</option>
                            </select>
                        </div>

                        <Input name="deliveryTimeGuarantee" label="Delivery Time Guarantee *" value={formData.deliveryTimeGuarantee} onChange={handleChange} />
                        <Input name="insuranceCoverage" type="number" label="Insurance Coverage Amount (€) *" value={formData.insuranceCoverage} onChange={handleChange} />
                        <Input name="luxuryTransportExperience" type="number" label="Experience in Luxury Transport (Years) *" value={formData.luxuryTransportExperience} onChange={handleChange} />
                    </div>
                )}
            </div>
        );
    };

    const renderForm3 = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-8">
                    <p className="text-gold text-xs tracking-widest uppercase mb-2">Form 3</p>
                    <h2 className="font-display text-3xl text-ivory">Quality Verification</h2>
                    <p className="text-ivory/50 text-sm mt-2">Upload the required documents to prove premium status.</p>
                </div>

                {role === 'Couture House' && (
                    <div className="space-y-4">
                        <FileInput name="commercialRegister" label="Commercial Register (PDF) *" onChange={handleChange} />
                        <FileInput name="portfolioPhotos" label="Portfolio Photos (min 5 high quality photos) *" onChange={handleChange} />
                        <p className="text-xs text-gold/60 -mt-2 mb-2">⚡ IMPORTANT: Portfolio is the main criteria for Haute Couture validation.</p>
                        <FileInput name="workshopPhoto" label="Workshop Photo *" onChange={handleChange} />
                        <FileInput name="ownerId" label="Owner ID *" onChange={handleChange} />
                        <FileInput name="professionalLicense" label="Professional License *" onChange={handleChange} />
                    </div>
                )}

                {role === 'Fournisseur' && (
                    <div className="space-y-4">
                        <FileInput name="commercialRegister" label="Commercial Register *" onChange={handleChange} />
                        <FileInput name="ownerId" label="Owner ID (ID Card) *" onChange={handleChange} />
                        <FileInput name="fabricQualityCert" label="Fabric Quality Certificate (if available)" required={false} onChange={handleChange} />
                        <FileInput name="fabricSamplePhotos" label="3 Fabric Sample Photos (high resolution) *" onChange={handleChange} />
                        <FileInput name="warehousePhoto" label="Warehouse Photo *" onChange={handleChange} />
                    </div>
                )}

                {role === 'Delivery' && (
                    <div className="space-y-4">
                        <FileInput name="commercialRegister" label="Commercial Register *" onChange={handleChange} />
                        <FileInput name="ownerId" label="Owner ID (ID Card) *" onChange={handleChange} />
                        <FileInput name="insuranceDocument" label="Insurance Document *" onChange={handleChange} />
                        <FileInput name="vehiclePhotos" label="Vehicle Photos *" onChange={handleChange} />
                        <FileInput name="luxuryReference" label="Luxury goods reference (optional but strong)" required={false} onChange={handleChange} />
                    </div>
                )}
            </div>
        );
    };

    const renderTermsModal = () => (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-noir/95 backdrop-blur-md">
            <div className="bg-secondary border border-subtle/50 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-sm shadow-2xl relative">
                <div className="p-8 border-b border-subtle/30 flex justify-between items-center">
                    <h2 className="font-display text-2xl text-ivory">Terms & Conditions</h2>
                    <button onClick={() => setShowTerms(false)} className="text-ivory/50 hover:text-gold transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto text-sm text-ivory/70 space-y-4 font-light leading-relaxed">
                    <p>
                        Welcome to Maison Tissue. By registering for an account, you automatically agree to abide by our
                        strict rules and regulations governing e-commerce, global logistics, and high-end couture sourcing.
                    </p>
                    <h3 className="font-display text-gold text-lg mt-6 mb-2">1. User Responsibilities & Account Security</h3>
                    <p>
                        You are solely responsible for maintaining the confidentiality of your login credentials. Any activity
                        conducted under your account will be treated as authorized by you. Maison Tissue reserves the right
                        to suspend or terminate accounts that show suspicious or fraudulent activity.
                    </p>
                    <h3 className="font-display text-gold text-lg mt-6 mb-2">2. E-Commerce & Transactions</h3>
                    <p>
                        All purchases, orders, and contracts created through our platform are final. Disputes regarding
                        fabric quality, timely delivery, and measurement inaccuracies must be lodged within 48 hours of
                        receipt. You agree to submit to our internal arbitration process before seeking external legal remedies.
                    </p>
                    <h3 className="font-display text-gold text-lg mt-6 mb-2">3. Role-Specific Obligations</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Couture Houses:</strong> Must maintain valid business registration numbers.</li>
                        <li><strong>Fournisseurs (Suppliers):</strong> Must guarantee the authenticity and ethical sourcing of all materials listed.</li>
                        <li><strong>Delivery Companies:</strong> Must provide real-time tracking and adhere to luxury handling standards.</li>
                    </ul>
                    <h3 className="font-display text-gold text-lg mt-6 mb-2">4. Privacy & Data Handling</h3>
                    <p>
                        We collect and process 3D body mapping data, locations, and financial metadata. By accepting these terms,
                        you consent to our global data processing protocols in compliance with international data privacy laws.
                    </p>
                </div>
                <div className="p-8 border-t border-subtle/30 flex justify-end">
                    <button
                        onClick={() => {
                            setFormData(prev => ({ ...prev, agreeRules: true }));
                            setShowTerms(false);
                        }}
                        className="btn btn-primary"
                    >
                        Accept Terms
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-noir/90 backdrop-blur-sm">
            {showTerms && renderTermsModal()}
            <div className="bg-secondary border border-subtle/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-ivory/50 hover:text-gold transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-8 md:p-12">
                    {successMsg && (
                        <div className="mb-6 p-4 rounded-sm bg-gold/10 border border-gold/30 flex items-center gap-3 animate-fade-in text-gold text-sm">
                            <CheckCircle2 size={18} className="shrink-0" />
                            <p>{successMsg}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 rounded-sm bg-red-950/30 border border-red-900/50 flex items-center gap-3 animate-fade-in text-red-200 text-sm">
                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {step > 1 && renderStepIndicator()}

                    {step === 1 && renderRoleSelection()}
                    {step === 2 && renderBasicInfo()}
                    {step === 3 && renderForm2()}
                    {step === 4 && renderForm3()}

                    {/* Navigation Buttons */}
                    {step > 1 && (
                        <div className="flex justify-between mt-12 pt-8 border-t border-subtle/30">
                            <button
                                onClick={() => setStep(step - 1)}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <ArrowLeft size={16} /> Back
                            </button>

                            {step < (role === 'Client' ? 2 : 4) ? (
                                <button
                                    onClick={handleNext}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    Complete Registration <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="mt-8 pt-8 border-t border-subtle/30 text-center">
                            <p className="text-sm text-ivory/60">
                                Already have an account?{' '}
                                <button
                                    onClick={onSwitchToLogin}
                                    className="text-gold hover:underline transition-colors font-medium"
                                >
                                    Login
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-components
const RoleCard = ({ icon, title, desc, onClick }) => (
    <div
        onClick={onClick}
        className="group p-6 border border-subtle/30 bg-muted/20 hover:border-gold/50 hover:bg-gold/5 cursor-pointer transition-all duration-300 text-center flex flex-col items-center gap-4 rounded-sm"
    >
        <div className="text-gold/50 group-hover:text-gold transition-colors duration-300">
            {icon}
        </div>
        <div>
            <h3 className="font-display text-lg text-ivory mb-1">{title}</h3>
            <p className="text-xs text-ivory/50">{desc}</p>
        </div>
    </div>
);

const Input = ({ label, name, type = "text", value, onChange }) => (
    <div className="flex flex-col gap-2">
        <label className="text-label">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className="input-couture"
            required
        />
    </div>
);

const FileInput = ({ label, name, required = true, onChange }) => (
    <div className="flex flex-col gap-2">
        <label className="text-label flex justify-between">
            {label}
            {!required && <span className="text-ivory/40 text-xs">Optional</span>}
        </label>
        <input
            type="file"
            name={name}
            onChange={onChange}
            className="block w-full text-sm text-ivory/70 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-gold/10 file:text-gold hover:file:bg-gold/20 transition-all focus:outline-none file:cursor-pointer"
            required={required}
        />
    </div>
);

export default RegistrationModal;

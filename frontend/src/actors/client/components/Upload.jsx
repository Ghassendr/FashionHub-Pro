import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileVideo, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Upload({ onResult, onLoading }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            handleUpload(selected);
        }
    };

    const handleUpload = async (videoFile) => {
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('height', '175'); // Default, could be input
        formData.append('weight', '70');

        onLoading(true);
        onResult(null);
        setError(null);

        try {
            // Use relatively simplified upload without progress bar for now to ensure stability
            const response = await axios.post('http://localhost:8000/api/client/videos/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 minutes timeout for 1500 frames
            });

            if (response.data) {
                // Ensure the base URL is prepended if not already present
                let result = { ...response.data };
                if (result.mesh_url && !result.mesh_url.startsWith('http')) {
                    result.mesh_url = `http://localhost:8000${result.mesh_url}`;
                }
                onResult(result);
            }
        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please try again.");
        } finally {
            onLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-black transition-colors"
                onClick={() => fileInputRef.current.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileChange}
                />

                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadIcon className="text-gray-400" size={32} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Body Scan</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Record a 360° video in T-Pose.<br />MP4, MOV supported.
                </p>

                <button className="bg-black text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors">
                    Select Video File
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}
        </div>
    );
}

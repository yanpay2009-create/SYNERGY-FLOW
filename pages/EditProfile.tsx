

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Save, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EditProfile: React.FC = () => {
  const { user, updateUserProfile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    lineId: user?.lineId || '',
    avatar: user?.avatar || ''
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(formData);
    alert('Profile updated successfully!');
    navigate(-1);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">Edit Profile</h1>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-soft">
         <div className="flex justify-center mb-6">
            <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
                <img src={formData.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-md object-cover" />
                <button type="button" className="absolute bottom-0 right-0 bg-synergy-blue text-white p-2 rounded-full border-2 border-white shadow-sm group-hover:bg-synergy-dark transition">
                    <Camera size={16} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full mt-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full mt-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone Number</label>
                <input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full mt-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20"
                />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Line ID</label>
                <input 
                    value={formData.lineId}
                    onChange={e => setFormData({...formData, lineId: e.target.value})}
                    className="w-full mt-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-synergy-blue/20"
                    placeholder="Line ID for contact"
                />
            </div>

            <button type="submit" className="w-full bg-synergy-blue text-white font-bold py-4 rounded-xl shadow-glow mt-4 flex items-center justify-center space-x-2 active:scale-[0.98] transition">
                <Save size={18} />
                <span>Save Changes</span>
            </button>
         </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowLeft, Plus, Megaphone, Trash2, Camera, Type, Save, FileText, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const AdminCampaignAssetManage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignAssets, updateCampaignAsset, deleteCampaignAsset, addCampaignAsset } = useApp();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, assetId: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateCampaignAsset(assetId, { image: base64 });
        // Reset input value to allow re-uploading the same file
        event.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNew = () => {
    addCampaignAsset({
        title: "New Seasonal Campaign",
        description: "High performance marketing kit for affiliates.",
        image: "https://picsum.photos/200/200?random=" + Math.floor(Math.random() * 500),
        active: true
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
        deleteCampaignAsset(id);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold ml-2 text-gray-900 dark:text-white">Campaign Assets</h1>
        </div>
        <button 
            onClick={handleAddNew} 
            className="p-2 bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-600 active:scale-90 transition-all"
        >
            <Plus size={20} />
        </button>
      </div>

      <div className="space-y-6">
          {campaignAssets.map((asset) => (
              <div key={asset.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-transparent dark:border-gray-700 animate-in fade-in">
                  <div className="aspect-square w-24 h-24 mx-auto mt-4 rounded-2xl overflow-hidden relative group border border-gray-100 dark:border-gray-700">
                      <img src={asset.image} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <label className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg text-white cursor-pointer hover:bg-white/40 transition">
                              <Camera size={16} />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, asset.id)}
                              />
                          </label>
                      </div>
                  </div>
                  
                  <div className="p-4">
                      <div className="space-y-3">
                          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600">
                              <Type size={16} className="text-gray-400 shrink-0" />
                              <input 
                                defaultValue={asset.title || ''} 
                                onBlur={(e) => updateCampaignAsset(asset.id, { title: e.target.value })}
                                className="bg-transparent text-sm font-bold w-full focus:outline-none dark:text-white" 
                                placeholder="Asset Title"
                              />
                          </div>
                          <div className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600">
                              <FileText size={16} className="text-gray-400 shrink-0 mt-1" />
                              <textarea 
                                defaultValue={asset.description || ''} 
                                onBlur={(e) => updateCampaignAsset(asset.id, { description: e.target.value })}
                                className="bg-transparent text-xs w-full focus:outline-none dark:text-white h-12 resize-none" 
                                placeholder="Asset description..."
                              />
                          </div>
                          <div className="flex space-x-2">
                              <button 
                                onClick={() => updateCampaignAsset(asset.id, { active: !asset.active })}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center space-x-2 transition ${asset.active ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                              >
                                  {asset.active ? <Eye size={14} /> : <EyeOff size={14} />}
                                  <span>{asset.active ? 'Active' : 'Inactive'}</span>
                              </button>
                              <button onClick={() => handleDelete(asset.id)} className="p-3 bg-red-50 text-red-500 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition border border-transparent"><Trash2 size={16} /></button>
                          </div>
                      </div>
                  </div>
              </div>
          ))}

          {campaignAssets.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <Megaphone size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">No assets found.</p>
                  <button onClick={handleAddNew} className="mt-4 text-indigo-500 font-bold flex items-center justify-center space-x-2 mx-auto">
                      <Plus size={16} />
                      <span>Create First Asset</span>
                  </button>
              </div>
          )}
      </div>
      
      <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
          <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center"><Megaphone size={14} className="mr-2" /> Note</h4>
          <p className="text-[10px] text-indigo-500 leading-relaxed">These assets are downloadable banners and kits provided to affiliates to help them promote SYNERGY products. Inactive assets will not appear on the Affiliate Links page for users.</p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Asset, UserProfile, AssetStatus } from '../types';
import { ASSET_TYPES, STATUS_COLORS, cn } from '../utils';
import { Plus, X, Edit2, Trash2, Check, AlertTriangle, Cpu, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface AssetListProps {
  profile: UserProfile;
  onSelectAsset: (id: string) => void;
}

export function AssetList({ profile, onSelectAsset }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    assetId: '',
    assetType: ASSET_TYPES[0],
    location: '',
    status: 'Available' as AssetStatus,
    description: '',
    imageUrl: '',
    aiAnalysis: '',
    glbUrl: '',
    synthesisStatus: 'Pending' as any
  });

  const isAdmin = profile.role === 'Admin';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      assetId: asset.assetId,
      assetType: asset.assetType,
      location: asset.location,
      status: asset.status,
      description: asset.description,
      imageUrl: asset.imageUrl || '',
      aiAnalysis: asset.aiAnalysis || '',
      glbUrl: asset.glbUrl || '',
      synthesisStatus: asset.synthesisStatus || 'Pending'
    });
    setShowAddModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert('Image is too large. Please upload an image smaller than 800KB for the digital twin.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setFormData(prev => ({ ...prev, imageUrl }));
        // Automatically start analysis
        analyzeImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (directImageUrl?: string) => {
    const targetUrl = directImageUrl || formData.imageUrl;
    if (!targetUrl) return;
    
    setIsAnalyzing(true);
    try {
      // 1. Call the backend API for 3D generation (Modular Extension)
      const response = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl: targetUrl,
          assetType: formData.assetType 
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // 2. Perform structural analysis with Gemini for the digital twin metadata
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: targetUrl.split(',')[1],
              mimeType: "image/png"
            }
          },
          {
            text: "Describe this building's physical structure for a 3D digital twin. Focus on its shape, dimensions, and architectural style. Return a concise description."
          }
        ]
      });

      setFormData(prev => ({ 
        ...prev, 
        aiAnalysis: model.text || '',
        glbUrl: data.glbUrl || '',
        synthesisStatus: data.status === 'completed' ? 'Completed' : 'Pending'
      }));
    } catch (error) {
      console.error("3D Generation initialization failed:", error);
      // We don't alert here to avoid interrupting the flow if it's auto-triggered
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) {
      alert("Neural engine is still processing the asset structure. Please wait a moment.");
      return;
    }
    try {
      if (editingAsset) {
        await updateDoc(doc(db, 'assets', editingAsset.id), formData);
      } else {
        await addDoc(collection(db, 'assets'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setShowAddModal(false);
      setEditingAsset(null);
      setFormData({ 
        assetId: '', 
        assetType: ASSET_TYPES[0], 
        location: '', 
        status: 'Available', 
        description: '', 
        imageUrl: '', 
        aiAnalysis: '',
        glbUrl: '',
        synthesisStatus: 'Pending'
      });
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteDoc(doc(db, 'assets', deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">INFRASTRUCTURE REPOSITORY</h2>
          <p className="text-sm opacity-50 font-mono">Manage physical assets and their lifecycle states.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#141414] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-emerald-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>REGISTER NEW ASSET</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assets.map((asset) => (
          <motion.div
            layout
            key={asset.id}
            className="bg-white border border-[#141414] rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] opacity-50 uppercase tracking-widest">ID: {asset.assetId}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase",
                    STATUS_COLORS[asset.status]
                  )}>
                    {asset.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{asset.assetType}</h3>
                <p className="text-sm opacity-70">{asset.location}</p>
              </div>
              {isAdmin && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEdit(asset)}
                    className="p-2 hover:bg-black/5 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(asset.id)}
                    className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-black/5 flex justify-between items-center">
              <p className="text-xs opacity-50 italic truncate max-w-[50%]">{asset.description || 'No description provided.'}</p>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => onSelectAsset(asset.id)}
                  className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 hover:underline"
                >
                  <Cpu className="w-3 h-3" />
                  <span>VIEW TWIN</span>
                </button>
                <div className="flex items-center space-x-1 text-[10px] font-mono opacity-30">
                  <Check className="w-3 h-3" />
                  <span>VERIFIED</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#141414] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 text-center"
            >
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 uppercase">Confirm Deletion</h3>
              <p className="text-sm opacity-50 mb-8">This action is irreversible. The digital twin and all associated telemetry will be purged from the repository.</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-6 py-3 bg-black/5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-600 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E4E3E0] border border-[#141414] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-white">
                <h3 className="font-bold uppercase tracking-widest text-sm">
                  {editingAsset ? 'UPDATE ASSET' : 'REGISTER NEW ASSET'}
                </h3>
                <button onClick={() => { setShowAddModal(false); setEditingAsset(null); }} className="p-2 hover:bg-black/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono opacity-50 uppercase">Asset Identifier</label>
                    <input
                      required
                      type="text"
                      value={formData.assetId}
                      onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                      className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="e.g. BLDG-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono opacity-50 uppercase">Asset Type</label>
                    <select
                      value={formData.assetType}
                      onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                      className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono opacity-50 uppercase">Location / Coordinates</label>
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. North Wing, Floor 3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono opacity-50 uppercase">Lifecycle Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                    className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="Available">Available</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono opacity-50 uppercase">Technical Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black h-20 resize-none"
                    placeholder="Enter technical specifications or notes..."
                  />
                </div>

                <div className="space-y-4 p-4 bg-black/5 rounded-2xl border border-dashed border-black/10">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono opacity-50 uppercase">Real-time Asset Image</label>
                    {formData.imageUrl && (
                      <button 
                        type="button"
                        onClick={() => analyzeImage()}
                        disabled={isAnalyzing}
                        className="flex items-center space-x-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                      >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>{isAnalyzing ? 'ANALYZING...' : 'GENERATE 3D TWIN'}</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="relative w-20 h-20 bg-white border border-[#141414] rounded-xl overflow-hidden flex items-center justify-center group">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <ImageIcon className="w-6 h-6 opacity-20" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] opacity-50 leading-tight">
                        Upload a clear image of the physical asset. Our AI will analyze the structure to generate a high-fidelity 3D digital twin.
                      </p>
                    </div>
                  </div>

                  {formData.aiAnalysis && (
                    <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                      <p className="text-[10px] font-mono text-emerald-700 line-clamp-2">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {formData.aiAnalysis}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all uppercase tracking-widest text-xs"
                >
                  {editingAsset ? 'COMMIT UPDATES' : 'FINALIZE REGISTRATION'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

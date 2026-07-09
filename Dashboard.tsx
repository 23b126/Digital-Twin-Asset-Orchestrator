import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Asset, UserProfile } from '../types';
import { STATUS_COLORS } from '../utils';
import { 
  Activity, 
  Package, 
  AlertCircle, 
  CheckCircle2,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  profile: UserProfile;
  onSelectAsset: (id: string) => void;
}

export function Dashboard({ profile, onSelectAsset }: DashboardProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    maintenance: 0,
    assigned: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'assets'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetList);
      
      setStats({
        total: assetList.length,
        available: assetList.filter(a => a.status === 'Available').length,
        maintenance: assetList.filter(a => a.status === 'Under Maintenance').length,
        assigned: assetList.filter(a => a.status === 'Assigned').length
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOTAL ASSETS', value: stats.total, icon: Package, color: 'text-zinc-900' },
          { label: 'AVAILABLE', value: stats.available, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'MAINTENANCE', value: stats.maintenance, icon: AlertCircle, color: 'text-amber-600' },
          { label: 'ASSIGNED', value: stats.assigned, icon: Activity, color: 'text-blue-600' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white border border-[#141414] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">{stat.label}</p>
                <p className={cn("text-3xl font-bold mt-1", stat.color)}>{stat.value}</p>
              </div>
              <div className="p-2 bg-black/5 rounded-xl group-hover:bg-black group-hover:text-white transition-all">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Assets Table */}
      <div className="bg-white border border-[#141414] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#141414] flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-widest">
            {profile.role === 'Client' ? 'AVAILABLE FOR LEASE' : 'RECENT INFRASTRUCTURE'}
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input 
              type="text" 
              placeholder="SEARCH ASSETS..." 
              className="pl-10 pr-4 py-2 bg-black/5 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414] bg-black/5">
                <th className="p-4 font-serif italic text-xs opacity-50">Asset ID</th>
                <th className="p-4 font-serif italic text-xs opacity-50">Type</th>
                <th className="p-4 font-serif italic text-xs opacity-50">Location</th>
                <th className="p-4 font-serif italic text-xs opacity-50">Status</th>
                <th className="p-4 font-serif italic text-xs opacity-50">Action</th>
              </tr>
            </thead>
            <tbody>
              {(profile.role === 'Client' ? assets.filter(a => a.status === 'Available') : assets).map((asset) => (
                <tr key={asset.id} className="border-b border-[#141414] hover:bg-black/5 transition-all group">
                  <td className="p-4 font-mono text-xs font-bold">{asset.assetId}</td>
                  <td className="p-4 text-sm">{asset.assetType}</td>
                  <td className="p-4 text-sm opacity-70">{asset.location}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border uppercase",
                      STATUS_COLORS[asset.status]
                    )}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onSelectAsset(asset.id)}
                        className="p-2 hover:bg-black hover:text-white rounded-lg transition-all"
                        title="View Digital Twin"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      {profile.role === 'Client' && (
                        <button 
                          onClick={() => onSelectAsset(asset.id)} // For now, just go to twin, but we could add a direct lease button
                          className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                          title="Request Lease"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center opacity-30 font-mono text-xs">
                    NO ASSETS REGISTERED IN SYSTEM
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { cn } from '../utils';

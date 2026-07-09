import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { LeaseContract, UserProfile, Asset } from '../types';
import { cn } from '../utils';
import { FileText, Clock, CheckCircle2, AlertCircle, Plus, X, Calendar } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface LeaseManagementProps {
  profile: UserProfile;
}

export function LeaseManagement({ profile }: LeaseManagementProps) {
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [duration, setDuration] = useState<number>(6); // months
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch contracts
    const q = profile.role === 'Client' 
      ? query(collection(db, 'leaseContracts'), where('clientId', '==', profile.uid))
      : collection(db, 'leaseContracts');

    const unsubContracts = onSnapshot(q, (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaseContract)));
    });

    // Fetch available assets for new lease
    const unsubAssets = onSnapshot(query(collection(db, 'assets'), where('status', '==', 'Available')), (snapshot) => {
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAvailableAssets(assets);
      if (assets.length > 0 && !selectedAsset) {
        setSelectedAsset(assets[0].id);
      }
    });

    return () => {
      unsubContracts();
      unsubAssets();
    };
  }, [profile, selectedAsset]);

  const handleRequestLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const asset = availableAssets.find(a => a.id === selectedAsset);
      if (!asset) return;

      const startDate = new Date();
      const endDate = addMonths(startDate, duration);

      const contractId = `LC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Create contract
      await addDoc(collection(db, 'leaseContracts'), {
        contractId,
        clientId: profile.uid,
        assetId: asset.assetId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        paymentStatus: 'Pending',
        status: 'Active'
      });

      // Notify Admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin', // General admin tag or specific admin UID if known
        title: 'New Lease Request',
        message: `${profile.name} has requested a lease for asset ${asset.assetId}.`,
        type: 'LeaseRequest',
        read: false,
        createdAt: new Date().toISOString()
      });

      // Update asset status
      await updateDoc(doc(db, 'assets', selectedAsset), {
        status: 'Assigned'
      });

      setShowRequestModal(false);
      setSelectedAsset('');
    } catch (error) {
      console.error('Error requesting lease:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (contract: LeaseContract) => {
    try {
      await updateDoc(doc(db, 'leaseContracts', contract.id), {
        paymentStatus: 'Paid'
      });

      // Notify Admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        title: 'Payment Received',
        message: `${profile.name} has paid for lease ${contract.contractId}.`,
        type: 'Payment',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">LEASE ORCHESTRATION</h2>
          <p className="text-sm opacity-50 font-mono">Manage active contracts and asset allocations.</p>
        </div>
        {profile.role === 'Client' && (
          <button 
            onClick={() => setShowRequestModal(true)}
            className="bg-[#141414] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-emerald-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>REQUEST NEW LEASE</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {contracts.map((contract) => (
          <div key={contract.id} className="bg-white border border-[#141414] p-6 rounded-2xl flex items-center justify-between hover:shadow-md transition-all">
            <div className="flex items-center space-x-6">
              <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 opacity-30" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono opacity-50 uppercase">Contract: {contract.contractId}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase",
                    contract.status === 'Active' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-zinc-500 border-zinc-500/20 bg-zinc-500/5'
                  )}>
                    {contract.status}
                  </span>
                </div>
                <h4 className="font-bold text-lg">Asset Allocation: {contract.assetId}</h4>
                <div className="flex items-center space-x-4 mt-1 text-xs opacity-50">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Expires: {format(new Date(contract.endDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className={cn(contract.paymentStatus === 'Paid' ? 'text-emerald-600 font-bold' : '')}>
                      Payment: {contract.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-xs font-bold border border-[#141414] rounded-lg hover:bg-black hover:text-white transition-all">
                VIEW DETAILS
              </button>
              {contract.paymentStatus === 'Pending' && profile.role === 'Client' && (
                <button 
                  onClick={() => handlePayment(contract)}
                  className="px-4 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
                >
                  PROCESS PAYMENT
                </button>
              )}
            </div>
          </div>
        ))}

        {contracts.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-black/10 rounded-3xl">
            <AlertCircle className="w-8 h-8 opacity-20 mx-auto mb-4" />
            <p className="text-sm font-mono opacity-30">NO ACTIVE CONTRACTS FOUND IN REGISTRY</p>
          </div>
        )}
      </div>

      {/* Request Lease Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E4E3E0] border border-[#141414] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-white">
                <h3 className="font-bold uppercase tracking-widest text-sm">REQUEST ASSET LEASE</h3>
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestLease} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono opacity-50 uppercase">Select Available Asset</label>
                  <select
                    required
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full bg-white border border-[#141414] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {availableAssets.length === 0 ? (
                      <option disabled>No assets available for lease</option>
                    ) : (
                      availableAssets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.assetId} - {asset.assetType} ({asset.location})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono opacity-50 uppercase">Lease Duration (Months)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDuration(m)}
                        className={cn(
                          "py-2 rounded-lg text-xs font-bold border transition-all",
                          duration === m 
                            ? "bg-[#141414] text-white border-[#141414]" 
                            : "bg-white text-black border-black/10 hover:border-black"
                        )}
                      >
                        {m}M
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/5 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-50">Start Date</span>
                    <span className="font-bold">{format(new Date(), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="opacity-50">End Date</span>
                    <span className="font-bold">{format(addMonths(new Date(), duration), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                <button
                  disabled={availableAssets.length === 0 || isSubmitting}
                  type="submit"
                  className="w-full bg-[#141414] text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-[#141414] transition-all uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'PROCESSING...' : 'CONFIRM LEASE REQUEST'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

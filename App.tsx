import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Asset, DigitalTwin, LeaseContract } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AssetList } from './components/AssetList';
import { DigitalTwinView } from './components/DigitalTwinView';
import { LeaseManagement } from './components/LeaseManagement';
import { Login } from './components/Login';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser ? `User: ${firebaseUser.email}` : "No User");
      setLoading(true);
      setError(null);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log("Fetching profile for:", firebaseUser.uid);
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            console.log("Profile found:", docSnap.data());
            setProfile(docSnap.data() as UserProfile);
          } else {
            console.log("No profile found, creating new one...");
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anonymous User',
              email: firebaseUser.email || '',
              role: firebaseUser.email === '23b126@psgitech.ac.in' ? 'Admin' : 'Client'
            };
            await setDoc(userDocRef, newProfile);
            console.log("New profile created:", newProfile);
            setProfile(newProfile);
          }
        } catch (err: any) {
          console.error('Error fetching/creating profile:', err);
          setError(err.message || 'Failed to initialize user session');
          
          // Fallback for development/emergency: set a local profile if Firestore fails
          // but we have a valid authenticated user
          if (firebaseUser) {
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: firebaseUser.email === '23b126@psgitech.ac.in' ? 'Admin' : 'Client'
            });
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleSelectAsset = (e: any) => {
      setSelectedAssetId(e.detail);
      setActiveTab('twin');
    };
    window.addEventListener('select-asset', handleSelectAsset);
    return () => window.removeEventListener('select-asset', handleSelectAsset);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <div className="font-mono text-sm animate-pulse">INITIALIZING SYSTEM...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white border border-rose-500 p-8 rounded-3xl max-w-md space-y-4">
          <h2 className="text-xl font-bold text-rose-600 uppercase tracking-tight">System Access Denied</h2>
          <p className="text-sm opacity-70">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#141414] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="w-full border border-[#141414] py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <div className="font-mono text-sm animate-pulse">SYNCHRONIZING PROFILE...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard profile={profile} onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('twin'); }} />;
      case 'assets':
        return <AssetList profile={profile} onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('twin'); }} />;
      case 'twin':
        return <DigitalTwinView assetId={selectedAssetId} onBack={() => setActiveTab('dashboard')} />;
      case 'leases':
        return <LeaseManagement profile={profile} />;
      default:
        return <Dashboard profile={profile} onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('twin'); }} />;
    }
  };

  return (
    <Layout profile={profile} activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
